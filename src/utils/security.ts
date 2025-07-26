// src/utils/security.ts
/**
 * Security Headers Configuration for PDfree.tools
 * Generates CSP and other security headers based on environment
 */

import type { EnvironmentConfig } from '@/config/environment';

export interface SecurityHeaders {
  'Content-Security-Policy'?: string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Cross-Origin-Opener-Policy': string;
  'Cross-Origin-Embedder-Policy': string;
  'Cross-Origin-Resource-Policy': string;
  'Strict-Transport-Security'?: string;
}

// Extract Sentry ingest host from DSN
const getSentryHost = (dsn?: string): string => {
  if (!dsn) return '';
  
  try {
    // Sentry DSN format: https://key@org.ingest.sentry.io/project
    const url = new URL(dsn);
    return url.host; // Returns: org.ingest.sentry.io
  } catch {
    return '';
  }
};

// Build CSP sources conditionally
const buildCSPSources = (config: EnvironmentConfig) => {
  const isDev = config.environment === 'development';
  
  return {
    self: `'self'`,
    // Cloudflare services
    cfTurnstile: 'https://challenges.cloudflare.com',
    cfInsights: 'https://static.cloudflareinsights.com', // Fixed: was static.cloudflare.com
    // Analytics
    plausible: config.monitoring.plausibleApiHost || 'https://plausible.io',
    gtm: 'https://www.googletagmanager.com',
    // Error tracking
    sentry: getSentryHost(config.monitoring.sentryDsn),
    // Fonts
    googleFonts: 'https://fonts.googleapis.com',
    googleFontsStatic: 'https://fonts.gstatic.com',
    // Storage
    r2Storage: config.storage.r2PublicUrl,
  };
};

export const generateSecurityHeaders = (config: EnvironmentConfig): SecurityHeaders => {
  const isDev = config.environment === 'development';
  const sources = buildCSPSources(config);

  const headers: SecurityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY', // Will be superseded by frame-ancestors in CSP
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': [
      'accelerometer=()',
      'autoplay=()',
      'camera=()',
      'clipboard-read=(self)',
      'clipboard-write=(self)',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
      'browsing-topics=()', // Added for privacy
    ].join(', '),
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': isDev ? 'unsafe-none' : 'require-corp',
    'Cross-Origin-Resource-Policy': 'cross-origin', // Relaxed from same-origin to allow R2 assets
  };

  // HTTPS-only headers for production
  if (!isDev) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  // Content Security Policy (only if enabled)
  if (config.security.cspEnabled) {
    // Script sources - conditional building
    const scriptSources = [
      sources.self,
      ...(isDev ? [`'unsafe-eval'`] : []), // Remove unsafe-eval in production
      `'unsafe-inline'`, // Consider removing this with nonces/hashes
      sources.cfTurnstile,
      sources.plausible,
      sources.gtm,
    ].filter(Boolean);

    // Connect sources - only add non-empty values
    const connectSources = [
      sources.self,
      sources.cfTurnstile,
      sources.plausible,
      sources.sentry,
      sources.r2Storage,
    ].filter(Boolean);

    // Image sources
    const imgSources = [
      sources.self,
      'data:',
      'blob:',
      'https:', // Allow any HTTPS images
      sources.r2Storage,
    ].filter(Boolean);

    const cspDirectives = [
      `default-src ${sources.self}`,
      `script-src ${scriptSources.join(' ')}`,
      `style-src ${sources.self} 'unsafe-inline' ${sources.googleFonts}`,
      `font-src ${sources.self} ${sources.googleFontsStatic}`,
      `img-src ${imgSources.join(' ')}`,
      `media-src ${sources.self} blob:`,
      `object-src 'none'`,
      `base-uri ${sources.self}`,
      `form-action ${sources.self}`,
      `frame-ancestors 'none'`,
      `connect-src ${connectSources.join(' ')}`,
      `worker-src ${sources.self} blob:`,
      `manifest-src ${sources.self}`,
      ...(isDev ? [] : ['upgrade-insecure-requests']),
    ];

    headers['Content-Security-Policy'] = cspDirectives.join('; ');
  }

  return headers;
};

// Generate Next.js headers configuration
export const generateNextHeaders = (config: EnvironmentConfig) => {
  const securityHeaders = generateSecurityHeaders(config);
  
  return Object.entries(securityHeaders)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => ({
      key,
      value: value!,
    }));
};

// Generate Cloudflare Pages headers
export const generateCloudflareHeaders = (config: EnvironmentConfig): string => {
  const securityHeaders = generateSecurityHeaders(config);
  
  let headersConfig = '/*\n';
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) {
      headersConfig += `  ${key}: ${value}\n`;
    }
  });
  
  return headersConfig;
};

// Middleware function for Next.js
export const applySecurityHeaders = (config: EnvironmentConfig) => {
  return (request: Request) => {
    const headers = generateSecurityHeaders(config);
    const response = new Response();
    
    Object.entries(headers).forEach(([key, value]) => {
      if (value) {
        response.headers.set(key, value);
      }
    });
    
    return response;
  };
};

// Validation function for CSP
export const validateCSP = (csp: string): string[] => {
  const issues: string[] = [];
  
  // Check for common CSP issues
  if (csp.includes("'unsafe-eval'") && !csp.includes('development')) {
    issues.push("Remove 'unsafe-eval' from production CSP");
  }
  
  if (csp.includes("'unsafe-inline'")) {
    issues.push("Consider replacing