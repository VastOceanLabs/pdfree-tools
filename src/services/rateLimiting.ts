// services/rateLimiting.ts
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (ip: string, userId?: string) => string;
}

// Rate limit rules by endpoint type
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // File upload limits (most restrictive)
  UPLOAD: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 uploads per 15 min per IP
    skipSuccessfulRequests: false,
    skipFailedRequests: true, // Don't count failed uploads against limit
  },
  
  // File processing limits
  PROCESS: {
    windowMs: 5 * 60 * 1000, // 5 minutes  
    maxRequests: 20, // 20 processing jobs per 5 min
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // Download limits (more lenient)
  DOWNLOAD: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 50, // 50 downloads per 10 min
    skipSuccessfulRequests: false,
    skipFailedRequests: true,
  },
  
  // API endpoints
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 API calls per minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // General page requests
  PAGE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200, // 200 page requests per minute
    skipSuccessfulRequests: true,
    skipFailedRequests: true,
  }
};

// Abuse detection patterns
export interface AbusePattern {
  name: string;
  detector: (metrics: RateLimitMetrics) => boolean;
  action: 'warn' | 'block' | 'captcha';
  duration: number; // Block duration in ms
}

export interface RateLimitMetrics {
  ip: string;
  requestCount: number;
  errorRate: number;
  uploadSize: number;
  userAgent: string;
  referer?: string;
  timeWindow: number;
}

// Suspicious behavior patterns (refined to reduce false positives)
export const ABUSE_PATTERNS: AbusePattern[] = [
  {
    name: 'HIGH_FREQUENCY_UPLOADS',
    detector: (metrics) => metrics.requestCount > 8 && metrics.timeWindow < 60000, // 8+ uploads in 1 min
    action: 'captcha',
    duration: 10 * 60 * 1000, // 10 minutes
  },
  {
    name: 'HIGH_ERROR_RATE',
    detector: (metrics) => {
      if (metrics.requestCount === 0) return false; // Guard against division by zero
      return metrics.errorRate > 0.8 && metrics.requestCount > 15; // Raised threshold
    },
    action: 'block',
    duration: 30 * 60 * 1000, // 30 minutes
  },
  {
    name: 'LARGE_FILE_SPAM',
    detector: (metrics) => metrics.uploadSize > 100 * 1024 * 1024 && metrics.requestCount > 5, // 100MB+ files, more lenient
    action: 'captcha',
    duration: 15 * 60 * 1000, // 15 minutes
  },
  {
    name: 'BOT_USER_AGENT',
    detector: (metrics) => {
      const botPatterns = ['bot', 'crawler', 'scraper', 'curl', 'wget', 'spider'];
      return botPatterns.some(pattern => 
        metrics.userAgent.toLowerCase().includes(pattern)
      ) && metrics.requestCount > 10; // More lenient threshold
    },
    action: 'block',
    duration: 60 * 60 * 1000, // 1 hour
  },
  {
    name: 'SUSPICIOUS_NO_REFERER', // Scoped to sensitive endpoints only
    detector: (metrics) => !metrics.referer && metrics.requestCount > 50 && metrics.timeWindow < 5 * 60 * 1000, // 50+ requests in 5 min
    action: 'captcha',
    duration: 20 * 60 * 1000, // 20 minutes
  }
];

export class RateLimitService {
  private redis: Redis;
  private turnstileSecretKey: string;
  private saltKey: string;

  constructor(redisUrl: string, redisToken: string, turnstileSecretKey: string, saltKey: string = 'pdffree-salt') {
    this.redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    this.turnstileSecretKey = turnstileSecretKey;
    this.saltKey = saltKey;
  }

  // Hash IP for privacy
  private hashIP(ip: string): string {
    return crypto.createHash('sha256').update(ip + this.saltKey).digest('hex').slice(0, 32);
  }

  // Generate rate limit key
  private generateKey(
    type: keyof typeof RATE_LIMITS, 
    identifier: string, 
    config?: RateLimitConfig
  ): string {
    const hashedIP = this.hashIP(identifier);
    if (config?.keyGenerator) {
      return `rate_limit:${type}:${config.keyGenerator(hashedIP)}`;
    }
    return `rate_limit:${type}:${hashedIP}`;
  }

  // Atomic rate limit check and increment
  async checkAndIncrementRateLimit(
    type: keyof typeof RATE_LIMITS,
    identifier: string
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    requiresCaptcha: boolean;
    count: number;
  }> {
    const config = RATE_LIMITS[type];
    const key = this.generateKey(type, identifier, config);
    const window = Math.floor(Date.now() / config.windowMs);
    const windowKey = `${key}:${window}`;
    const resetTime = (window + 1) * config.windowMs;

    try {
      // Check if blocked first
      const abuseKey = `abuse:${this.hashIP(identifier)}`;
      const abuseStatus = await this.redis.get<string | null>(abuseKey);
      
      if (abuseStatus === 'blocked') {
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          requiresCaptcha: false,
          count: config.maxRequests
        };
      }

      // Atomic increment and get count
      const count = await this.redis.incr(windowKey);
      
      // Set expiration on first increment
      if (count === 1) {
        await this.redis.expire(windowKey, Math.ceil(config.windowMs / 1000));
      }

      const allowed = count <= config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - count);
      const requiresCaptcha = abuseStatus === 'captcha';

      return {
        allowed,
        remaining,
        resetTime,
        requiresCaptcha,
        count
      };

    } catch (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime,
        requiresCaptcha: false,
        count: 1
      };
    }
  }

  // Update metrics for abuse detection (now tracks upload size)
  async updateMetrics(
    identifier: string,
    type: keyof typeof RATE_LIMITS,
    success: boolean,
    uploadSize: number = 0
  ): Promise<void> {
    const metricsKey = `metrics:${this.hashIP(identifier)}`;
    const now = Date.now();
    
    try {
      // Get existing metrics
      const existingData = await this.redis.get<string | null>(metricsKey);
      let metrics;
      
      try {
        metrics = existingData ? JSON.parse(existingData) : {
          requestCount: 0,
          errorCount: 0,
          uploadSize: 0,
          firstRequest: now,
          lastRequest: now
        };
      } catch (parseError) {
        console.warn('Corrupted metrics data, resetting:', parseError);
        metrics = {
          requestCount: 0,
          errorCount: 0,
          uploadSize: 0,
          firstRequest: now,
          lastRequest: now
        };
      }

      // Update metrics
      metrics.requestCount++;
      metrics.lastRequest = now;
      metrics.uploadSize += uploadSize;
      if (!success) {
        metrics.errorCount++;
      }

      // Store updated metrics (expire after 1 hour)
      await this.redis.set(metricsKey, JSON.stringify(metrics), { ex: 3600 });

    } catch (error) {
      console.error('Metrics update error:', error);
    }
  }

  // Verify Cloudflare Turnstile token
  async verifyTurnstile(token: string, ip: string): Promise<boolean> {
    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: this.turnstileSecretKey,
          response: token,
          remoteip: ip,
        }),
      });

      const result = await response.json();
      
      // Clear captcha requirement if verification successful
      if (result.success === true) {
        const abuseKey = `abuse:${this.hashIP(ip)}`;
        await this.redis.del(abuseKey);
      }
      
      return result.success === true;

    } catch (error) {
      console.error('Turnstile verification error:', error);
      return false;
    }
  }

  // Check for abuse patterns and apply actions
  async checkAbusePatterns(identifier: string, userAgent: string, referer?: string): Promise<{
    action: 'allow' | 'captcha' | 'block';
    pattern?: string;
    duration?: number;
  }> {
    try {
      // Get metrics
      const metricsKey = `metrics:${this.hashIP(identifier)}`;
      const metricsData = await this.redis.get<string | null>(metricsKey);
      
      if (!metricsData) {
        return { action: 'allow' };
      }

      let metrics;
      try {
        metrics = JSON.parse(metricsData);
      } catch (parseError) {
        console.warn('Corrupted metrics data in abuse check:', parseError);
        return { action: 'allow' };
      }

      const rateLimitMetrics: RateLimitMetrics = {
        ip: identifier,
        requestCount: metrics.requestCount || 0,
        errorRate: metrics.requestCount > 0 ? (metrics.errorCount || 0) / metrics.requestCount : 0,
        uploadSize: metrics.uploadSize || 0,
        userAgent,
        referer,
        timeWindow: Date.now() - (metrics.firstRequest || Date.now())
      };

      // Check each abuse pattern
      for (const pattern of ABUSE_PATTERNS) {
        if (pattern.detector(rateLimitMetrics)) {
          // Apply action
          const abuseKey = `abuse:${this.hashIP(identifier)}`;
          const actionValue = pattern.action === 'block' ? 'blocked' : 'captcha';
          await this.redis.set(abuseKey, actionValue, { ex: Math.ceil(pattern.duration / 1000) });

          // Log abuse detection
          console.warn(`Abuse pattern detected: ${pattern.name} for IP ${identifier.slice(0, 8)}***`);

          return {
            action: pattern.action === 'warn' ? 'allow' : pattern.action,
            pattern: pattern.name,
            duration: pattern.duration
          };
        }
      }

      return { action: 'allow' };

    } catch (error) {
      console.error('Abuse pattern check error:', error);
      return { action: 'allow' }; // Fail open
    }
  }

  // Clear rate limit for identifier (admin function)
  async clearRateLimit(
    type: keyof typeof RATE_LIMITS,
    identifier: string
  ): Promise<void> {
    const config = RATE_LIMITS[type];
    const key = this.generateKey(type, identifier, config);
    const window = Math.floor(Date.now() / config.windowMs);
    const windowKey = `${key}:${window}`;
    const hashedIP = this.hashIP(identifier);

    try {
      await this.redis.pipeline()
        .del(windowKey)
        .del(`abuse:${hashedIP}`)
        .del(`metrics:${hashedIP}`)
        .exec();
    } catch (error) {
      console.error('Rate limit clear error:', error);
    }
  }

  // Get rate limit status for identifier
  async getStatus(identifier: string): Promise<{
    rateLimits: Record<string, { current: number; limit: number; resetTime: number }>;
    abuseStatus: string | null;
    metrics: any;
  }> {
    const status: any = {
      rateLimits: {},
      abuseStatus: null,
      metrics: null
    };

    const hashedIP = this.hashIP(identifier);

    try {
      // Get rate limit status for each type
      for (const [type, config] of Object.entries(RATE_LIMITS)) {
        const key = this.generateKey(type as keyof typeof RATE_LIMITS, identifier, config);
        const window = Math.floor(Date.now() / config.windowMs);
        const windowKey = `${key}:${window}`;
        
        const raw = await this.redis.get<string | null>(windowKey);
        const currentCount = raw ? Number(raw) : 0;
        
        status.rateLimits[type] = {
          current: currentCount,
          limit: config.maxRequests,
          resetTime: (window + 1) * config.windowMs
        };
      }

      // Get abuse status
      const abuseKey = `abuse:${hashedIP}`;
      status.abuseStatus = await this.redis.get<string | null>(abuseKey);

      // Get metrics
      const metricsKey = `metrics:${hashedIP}`;
      const metricsData = await this.redis.get<string | null>(metricsKey);
      if (metricsData) {
        try {
          status.metrics = JSON.parse(metricsData);
        } catch (parseError) {
          console.warn('Corrupted metrics in status check:', parseError);
          status.metrics = null;
        }
      }

      return status;

    } catch (error) {
      console.error('Status check error:', error);
      return status;
    }
  }
}

// Helper function to get client IP from different runtime contexts
export function getClientIP(request: Request | any): string {
  // For Fetch API (Cloudflare Workers, Vercel Edge)
  if (request.headers && typeof request.headers.get === 'function') {
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    const xRealIP = request.headers.get('x-real-ip');
    const xForwardedFor = request.headers.get('x-forwarded-for');
    
    if (cfConnectingIP) return cfConnectingIP;
    if (xRealIP) return xRealIP;
    if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  }
  
  // For Express/Node.js (request.headers is object)
  if (request.headers && typeof request.headers === 'object') {
    const cfConnectingIP = request.headers['cf-connecting-ip'];
    const xRealIP = request.headers['x-real-ip'];
    const xForwardedFor = request.headers['x-forwarded-for'];
    
    if (cfConnectingIP) return cfConnectingIP;
    if (xRealIP) return xRealIP;
    if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  }
  
  // Fallback
  return '0.0.0.0';
}

// Framework-specific middleware factories

// For Next.js API routes and middleware
export function createNextRateLimitMiddleware(
  rateLimitService: RateLimitService,
  type: keyof typeof RATE_LIMITS
) {
  return async (request: Request): Promise<Response | null> => {
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || undefined;

    try {
      // Check for abuse patterns first
      const abuseCheck = await rateLimitService.checkAbusePatterns(ip, userAgent, referer);
      
      if (abuseCheck.action === 'block') {
        return new Response(JSON.stringify({
          error: 'Access blocked due to suspicious activity',
          pattern: abuseCheck.pattern,
          retryAfter: Math.ceil((abuseCheck.duration || 0) / 1000)
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((abuseCheck.duration || 0) / 1000))
          }
        });
      }

      // Check and increment rate limit atomically
      const rateLimitCheck = await rateLimitService.checkAndIncrementRateLimit(type, ip);
      
      if (!rateLimitCheck.allowed) {
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          remainingTime: rateLimitCheck.resetTime - Date.now(),
          limit: RATE_LIMITS[type].maxRequests
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(RATE_LIMITS[type].maxRequests),
            'X-RateLimit-Remaining': String(rateLimitCheck.remaining),
            'X-RateLimit-Reset': String(Math.floor(rateLimitCheck.resetTime / 1000)), // Unix timestamp
            'Retry-After': String(Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000))
          }
        });
      }

      // If captcha required, check for turnstile token
      if (rateLimitCheck.requiresCaptcha || abuseCheck.action === 'captcha') {
        const turnstileToken = request.headers.get('cf-turnstile-response') || 
                             (await request.clone().formData().then(data => data.get('cf-turnstile-response')).catch(() => null));
        
        if (!turnstileToken) {
          return new Response(JSON.stringify({
            error: 'Captcha verification required',
            requiresCaptcha: true
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const isValidToken = await rateLimitService.verifyTurnstile(turnstileToken as string, ip);
        if (!isValidToken) {
          return new Response(JSON.stringify({
            error: 'Invalid captcha',
            requiresCaptcha: true
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Success - continue to next middleware/handler
      return null;

    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // Fail open - allow request
      return null;
    }
  };
}

// For Express/Node.js
export function createExpressRateLimitMiddleware(
  rateLimitService: RateLimitService,
  type: keyof typeof RATE_LIMITS
) {
  return async (req: any, res: any, next: any) => {
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || undefined;

    try {
      // Check for abuse patterns first
      const abuseCheck = await rateLimitService.checkAbusePatterns(ip, userAgent, referer);
      
      if (abuseCheck.action === 'block') {
        return res.status(429).json({
          error: 'Access blocked due to suspicious activity',
          pattern: abuseCheck.pattern,
          retryAfter: Math.ceil((abuseCheck.duration || 0) / 1000)
        });
      }

      // Check and increment rate limit atomically
      const rateLimitCheck = await rateLimitService.checkAndIncrementRateLimit(type, ip);
      
      if (!rateLimitCheck.allowed) {
        res.set({
          'X-RateLimit-Limit': String(RATE_LIMITS[type].maxRequests),
          'X-RateLimit-Remaining': String(rateLimitCheck.remaining),
          'X-RateLimit-Reset': String(Math.floor(rateLimitCheck.resetTime / 1000)),
          'Retry-After': String(Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000))
        });
        
        return res.status(429).json({
          error: 'Rate limit exceeded',
          remainingTime: rateLimitCheck.resetTime - Date.now(),
          limit: RATE_LIMITS[type].maxRequests
        });
      }

      // If captcha required, check for turnstile token
      if (rateLimitCheck.requiresCaptcha || abuseCheck.action === 'captcha') {
        const turnstileToken = req.headers['cf-turnstile-response'] || req.body?.['cf-turnstile-response'];
        
        if (!turnstileToken) {
          return res.status(403).json({
            error: 'Captcha verification required',
            requiresCaptcha: true
          });
        }

        const isValidToken = await rateLimitService.verifyTurnstile(turnstileToken, ip);
        if (!isValidToken) {
          return res.status(403).json({
            error: 'Invalid captcha',
            requiresCaptcha: true
          });
        }
      }

      // Add rate limit headers for successful requests
      res.set({
        'X-RateLimit-Limit': String(RATE_LIMITS[type].maxRequests),
        'X-RateLimit-Remaining': String(rateLimitCheck.remaining),
        'X-RateLimit-Reset': String(Math.floor(rateLimitCheck.resetTime / 1000))
      });

      next();

    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // Fail open - allow request
      next();
    }
  };
}