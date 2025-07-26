// lib/observability/index.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB, getINP } from 'web-vitals';

// Types for our observability system
export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  id: string;
  url: string;
  userAgent?: string;
}

export interface TrackedErrorEvent {
  message: string;
  stack?: string;
  url: string;
  timestamp: number;
  userAgent: string;
  userId?: string;
  sessionId: string;
  release?: string;
  environment: string;
  extra?: Record<string, any>;
}

export interface AnalyticsEvent {
  event: string;
  url: string;
  referrer?: string;
  timestamp: number;
  props?: Record<string, string | number | boolean>;
}

// Core Web Vitals thresholds (updated with INP)
const VITALS_THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint (replaces FID)
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

// Performance regression detection
class PerformanceRegression {
  private baseline: Map<string, number> = new Map();
  private readonly REGRESSION_THRESHOLD = 0.2; // 20% degradation

  setBaseline(metric: string, value: number): void {
    this.baseline.set(metric, value);
  }

  checkRegression(metric: string, currentValue: number): boolean {
    const baselineValue = this.baseline.get(metric);
    if (baselineValue === undefined) {
      this.setBaseline(metric, currentValue);
      return false;
    }

    const degradation = (currentValue - baselineValue) / baselineValue;
    return degradation > this.REGRESSION_THRESHOLD;
  }

  getBaselineValues(): Record<string, number> {
    return Object.fromEntries(this.baseline.entries());
  }
}

// Sentry Error Tracking Configuration
export class SentryTracker {
  private dsn: string;
  private environment: string;
  private release?: string;
  private sessionId: string;

  constructor(config: {
    dsn: string;
    environment: string;
    release?: string;
  }) {
    this.dsn = config.dsn;
    this.environment = config.environment;
    this.release = config.release;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  init(): void {
    // Skip initialization if DSN is empty
    if (!this.dsn) {
      console.warn('Sentry DSN not provided, skipping initialization');
      return;
    }

    // Initialize Sentry SDK
    if (typeof window !== 'undefined') {
      import('@sentry/browser').then(({ init, configureScope }) => {
        init({
          dsn: this.dsn,
          environment: this.environment,
          release: this.release,
          integrations: [
            // Browser integrations
          ],
          tracesSampleRate: this.environment === 'production' ? 0.1 : 1.0,
          beforeSend: (event) => {
            // Scrub sensitive data from URLs
            if (event.request?.url) {
              event.request.url = this.scrubUrl(event.request.url);
            }
            if (event.exception?.values) {
              event.exception.values.forEach(value => {
                if (value.stacktrace?.frames) {
                  value.stacktrace.frames.forEach(frame => {
                    if (frame.filename) {
                      frame.filename = this.scrubUrl(frame.filename);
                    }
                  });
                }
              });
            }
            return event;
          },
        });

        configureScope((scope) => {
          scope.setTag('sessionId', this.sessionId);
        });
      });
    }
  }

  private scrubUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove query parameters and hash
      return `${urlObj.origin}${urlObj.pathname}`;
    } catch {
      return '[invalid-url]';
    }
  }

  captureError(error: Error, extra?: Record<string, any>): void {
    if (!this.dsn) return;
    
    if (typeof window !== 'undefined') {
      import('@sentry/browser').then(({ captureException, withScope }) => {
        withScope((scope) => {
          if (extra) {
            Object.entries(extra).forEach(([key, value]) => {
              scope.setExtra(key, value);
            });
          }
          captureException(error);
        });
      });
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (!this.dsn) return;
    
    if (typeof window !== 'undefined') {
      import('@sentry/browser').then(({ captureMessage }) => {
        captureMessage(message, level);
      });
    }
  }
}

// Plausible Analytics Configuration
export class PlausibleTracker {
  private domain: string;
  private apiHost: string;
  private eventQueue: AnalyticsEvent[] = [];
  private isLoaded = false;

  constructor(config: {
    domain: string;
    apiHost?: string;
  }) {
    this.domain = config.domain;
    this.apiHost = config.apiHost || 'https://plausible.io';
  }

  init(): void {
    if (typeof window !== 'undefined') {
      // Load Plausible script (manual mode to control pageviews)
      const script = document.createElement('script');
      script.defer = true;
      script.dataset.domain = this.domain;
      script.src = `${this.apiHost}/js/script.manual.js`;
      script.onload = () => {
        this.isLoaded = true;
        this.flushEventQueue();
      };
      document.head.appendChild(script);
    }
  }

  private flushEventQueue(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      this.sendEvent(event.event, event.props);
    }
  }

  private sendEvent(eventName: string, props?: Record<string, string | number | boolean>): void {
    if (typeof window !== 'undefined' && (window as any).plausible) {
      // Convert all props to strings as Plausible prefers
      const stringProps = props ? Object.fromEntries(
        Object.entries(props).map(([key, value]) => [key, String(value)])
      ) : undefined;
      
      (window as any).plausible(eventName, { props: stringProps });
    }
  }

  trackEvent(eventName: string, props?: Record<string, string | number | boolean>): void {
    if (this.isLoaded) {
      this.sendEvent(eventName, props);
    } else {
      // Queue events until Plausible is loaded
      this.eventQueue.push({
        event: eventName,
        url: window.location.href,
        timestamp: Date.now(),
        props,
      });
    }
  }

  trackPageView(url?: string): void {
    if (this.isLoaded) {
      this.sendEvent('pageview', { u: url || window.location.href });
    }
  }
}

// Core Web Vitals Monitoring
export class WebVitalsTracker {
  private performanceRegression: PerformanceRegression;
  private onMetric: (metric: PerformanceMetric) => void;

  constructor(onMetric: (metric: PerformanceMetric) => void) {
    this.performanceRegression = new PerformanceRegression();
    this.onMetric = onMetric;
  }

  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = VITALS_THRESHOLDS[name as keyof typeof VITALS_THRESHOLDS];
    if (!thresholds) return 'good';
    
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }

  private getUnit(name: string): string {
    if (name === 'CLS') return ''; // CLS is unitless
    return 'ms';
  }

  private handleMetric(name: string, value: number, id: string): void {
    const metric: PerformanceMetric = {
      name,
      value,
      rating: this.getRating(name, value),
      timestamp: Date.now(),
      id,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Check for performance regression
    const hasRegression = this.performanceRegression.checkRegression(name, value);
    if (hasRegression) {
      const unit = this.getUnit(name);
      console.warn(`Performance regression detected for ${name}: ${value}${unit}`);
      // Could send alert to monitoring system
    }

    this.onMetric(metric);
  }

  init(): void {
    if (typeof window === 'undefined') return;

    // Track Core Web Vitals (compatible with web-vitals v2/v3)
    getCLS((metric) => this.handleMetric('CLS', metric.value, metric.id));
    getFID((metric) => this.handleMetric('FID', metric.value, metric.id));
    getINP((metric) => this.handleMetric('INP', metric.value, metric.id));
    getFCP((metric) => this.handleMetric('FCP', metric.value, metric.id));
    getLCP((metric) => this.handleMetric('LCP', metric.value, metric.id));
    getTTFB((metric) => this.handleMetric('TTFB', metric.value, metric.id));

    // Track custom metrics
    this.trackCustomMetrics();
  }

  private trackCustomMetrics(): void {
    // File processing time tracking
    window.addEventListener('file-processing-start', () => {
      performance.mark('file-processing-start');
    });

    window.addEventListener('file-processing-end', () => {
      performance.mark('file-processing-end');
      performance.measure('file-processing-duration', 'file-processing-start', 'file-processing-end');
      
      const measures = performance.getEntriesByName('file-processing-duration');
      if (measures.length > 0) {
        const duration = measures[measures.length - 1].duration;
        this.handleMetric('FILE_PROCESSING', duration, `processing-${Date.now()}`);
        
        // Clean up performance entries to prevent memory leaks
        performance.clearMarks('file-processing-start');
        performance.clearMarks('file-processing-end');
        performance.clearMeasures('file-processing-duration');
      }
    });

    // Navigation timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        if (navigation) {
          this.handleMetric('DOM_CONTENT_LOADED', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart, `dcl-${Date.now()}`);
          this.handleMetric('LOAD_EVENT', navigation.loadEventEnd - navigation.loadEventStart, `load-${Date.now()}`);
        }
      }, 0);
    });
  }

  getBaselineMetrics(): Record<string, number> {
    return this.performanceRegression.getBaselineValues();
  }
}

// Main Observability Manager
export class ObservabilityManager {
  private sentryTracker: SentryTracker;
  private plausibleTracker: PlausibleTracker;
  private webVitalsTracker: WebVitalsTracker;
  private metricsBuffer: PerformanceMetric[] = [];
  private flushInterval: number | null = null;
  private readonly BUFFER_SIZE = 10;
  private readonly MAX_METRICS_PER_FLUSH = 50; // Prevent excessive payloads

  constructor(config: {
    sentry: {
      dsn: string;
      environment: string;
      release?: string;
    };
    plausible: {
      domain: string;
      apiHost?: string;
    };
  }) {
    this.sentryTracker = new SentryTracker(config.sentry);
    this.plausibleTracker = new PlausibleTracker(config.plausible);
    this.webVitalsTracker = new WebVitalsTracker(this.handleMetric.bind(this));
  }

  init(): void {
    this.sentryTracker.init();
    this.plausibleTracker.init();
    this.webVitalsTracker.init();

    // Set up global error handlers
    this.setupGlobalErrorHandlers();
    
    // Set up periodic metrics flush
    this.setupMetricsFlush();
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      this.sentryTracker.captureError(reason, { 
        type: 'unhandledrejection',
        originalReason: event.reason 
      });
    });

    // Global error handler
    window.addEventListener('error', (event) => {
      this.sentryTracker.captureError(event.error || new Error(event.message), {
        type: 'javascript-error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });
  }

  private setupMetricsFlush(): void {
    // Clear any existing interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Flush metrics buffer periodically
    this.flushInterval = window.setInterval(() => {
      if (this.metricsBuffer.length > 0) {
        this.flushMetrics();
      }
    }, 30000); // Every 30 seconds

    // Flush on page unload with sendBeacon fallback
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushMetricsSync();
      });
    }
  }

  private handleMetric(metric: PerformanceMetric): void {
    this.metricsBuffer.push(metric);

    // Track significant metrics with Plausible
    if (metric.rating === 'poor') {
      this.plausibleTracker.trackEvent('Performance Issue', {
        metric: metric.name,
        value: metric.value.toString(),
        rating: metric.rating,
      });
    }

    // Flush buffer if full
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      this.flushMetrics();
    }
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    // Limit payload size
    const metricsToFlush = this.metricsBuffer.splice(0, this.MAX_METRICS_PER_FLUSH);

    try {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metrics: metricsToFlush }),
      });
    } catch (error) {
      console.warn('Failed to flush metrics:', error);
      // Don't send to Sentry to avoid infinite loops
    }
  }

  private flushMetricsSync(): void {
    if (this.metricsBuffer.length === 0) return;

    const payload = { metrics: this.metricsBuffer.splice(0, this.MAX_METRICS_PER_FLUSH) };

    // Use sendBeacon for reliable delivery during page unload
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/metrics', blob);
    } else {
      // Fallback to fetch (may be cancelled by browser)
      fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Ignore errors during unload
      });
    }
  }

  // Public API
  trackError(error: Error, extra?: Record<string, any>): void {
    this.sentryTracker.captureError(error, extra);
  }

  trackEvent(eventName: string, props?: Record<string, string | number | boolean>): void {
    this.plausibleTracker.trackEvent(eventName, props);
  }

  trackPageView(url?: string): void {
    this.plausibleTracker.trackPageView(url);
  }

  getPerformanceBaseline(): Record<string, number> {
    return this.webVitalsTracker.getBaselineMetrics();
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flushMetricsSync();
  }
}

// Environment configuration
export const createObservabilityConfig = () => {
  const environment = process.env.NODE_ENV || 'development';

  return {
    sentry: {
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
      environment,
      release: process.env.NEXT_PUBLIC_APP_VERSION,
    },
    plausible: {
      domain: process.env.NEXT_PUBLIC_DOMAIN || 'pdffree.tools',
      apiHost: process.env.NEXT_PUBLIC_PLAUSIBLE_HOST,
    },
  };
};

// Export singleton instance
let observabilityManager: ObservabilityManager | null = null;

export const getObservabilityManager = (): ObservabilityManager => {
  if (!observabilityManager) {
    observabilityManager = new ObservabilityManager(createObservabilityConfig());
  }
  return observabilityManager;
};

// Helper functions for common tracking scenarios
export const trackFileProcessing = (toolName: string, fileSize: number, processingTime: number) => {
  const manager = getObservabilityManager();
  manager.trackEvent('File Processed', {
    tool: toolName,
    size: Math.round(fileSize / 1024), // KB
    duration: Math.round(processingTime), // ms
  });
};

export const trackToolUsage = (toolName: string, source: string = 'direct') => {
  const manager = getObservabilityManager();
  manager.trackEvent('Tool Used', {
    tool: toolName,
    source,
  });
};

export const trackError = (error: Error, context?: string) => {
  const manager = getObservabilityManager();
  manager.trackError(error, { context });
};

// Initialize on import in browser
if (typeof window !== 'undefined') {
  const manager = getObservabilityManager();
  manager.init();
}