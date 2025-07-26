// src/types/config.ts
/**
 * TypeScript type definitions for PDfree.tools configuration system
 * Shared interfaces and types across the application
 */

// Re-export main configuration types
export type {
  Environment,
  EnvironmentConfig,
} from '@/config/environment';

export type {
  SecurityHeaders,
  RateLimitConfig,
  CorsConfig,
} from '@/utils/security';

export type {
  BuildOptimizationConfig,
} from '../build.config';

// Global window interface extensions
declare global {
  interface Window {
    __ENV__?: Environment;
    __VERSION__?: string;
    __DEV__?: boolean;
    __PROD__?: boolean;
  }
}

// Environment variable types for better type safety
interface ProcessEnv {
  // Build-time variables
  NODE_ENV?: 'development' | 'staging' | 'production';
  ANALYZE?: 'true' | 'false';
  
  // Runtime variables (NEXT_PUBLIC_* are available in browser)
  NEXT_PUBLIC_ENV?: Environment;
  NEXT_PUBLIC_APP_VERSION?: string;
  NEXT_PUBLIC_DOMAIN?: string;
  
  // Storage configuration
  NEXT_PUBLIC_R2_BUCKET?: string;
  NEXT_PUBLIC_R2_ACCOUNT_ID?: string;
  NEXT_PUBLIC_R2_PUBLIC_URL?: string;
  
  // Monitoring configuration
  NEXT_PUBLIC_SENTRY_DSN?: string;
  NEXT_PUBLIC_PLAUSIBLE_HOST?: string;
  
  // Security configuration
  NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
}

declare namespace NodeJS {
  interface ProcessEnv extends ProcessEnv {}
}

// Configuration validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Feature flag type for type-safe feature checking
export type FeatureFlag = keyof EnvironmentConfig['features'];

// Log level type
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Error tracking interfaces
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  timestamp: number;
  environment: Environment;
  version: string;
}

export interface PerformanceMetrics {
  bundleSize: number;
  chunkCount: number;
  assetCount: number;
  loadTime: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
  interactionToNextPaint?: number;
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    requestId: string;
    timestamp: number;
    version: string;
  };
}

// File processing types
export interface FileProcessingConfig {
  maxFileSize: number;
  allowedTypes: string[];
  compressionQuality?: number;
  timeout: number;
}

export interface ProcessingResult {
  success: boolean;
  outputUrl?: string;
  error?: string;
  processingTime: number;
  originalSize: number;
  compressedSize?: number;
}

// Monitoring event types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

export interface ErrorEvent {
  error: Error;
  context?: string;
  metadata?: Record<string, any>;
  timestamp: number;
  level: 'warning' | 'error' | 'fatal';
}

// CSP directive types for type-safe CSP building
export type CSPDirective = 
  | 'default-src'
  | 'script-src'
  | 'style-src'
  | 'img-src'
  | 'font-src'
  | 'connect-src'
  | 'media-src'
  | 'object-src'
  | 'child-src'
  | 'frame-src'
  | 'worker-src'
  | 'frame-ancestors'
  | 'form-action'
  | 'base-uri'
  | 'manifest-src';

export type CSPSource = 
  | "'self'"
  | "'unsafe-inline'"
  | "'unsafe-eval'"
  | "'strict-dynamic'"
  | "'none'"
  | string; // URLs

export interface CSPConfig {
  [key in CSPDirective]?: CSPSource[];
}

// Build configuration types
export interface BuildMetrics {
  buildTime: number;
  bundleSize: number;
  chunkSizes: Record<string, number>;
  warnings: string[];
  errors: string[];
}

export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  techniques: string[];
}

// Runtime configuration types (for dynamic config updates)
export interface RuntimeConfig {
  features: Partial<EnvironmentConfig['features']>;
  rateLimit?: Partial<RateLimitConfig>;
  lastUpdated: number;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type ConfigWithDefaults<T> = T & {
  readonly _defaults: DeepPartial<T>;
  readonly _computed: boolean;
};

// Environment-specific configurations
export interface DevelopmentConfig extends EnvironmentConfig {
  environment: 'development';
  features: {
    enableDebugMode: true;
    enableAnalytics: false;
    enableErrorTracking: false;
  };
}

export interface ProductionConfig extends EnvironmentConfig {
  environment: 'production';
  features: {
    enableDebugMode: false;
    enableAnalytics: true;
    enableErrorTracking: true;
  };
  storage: RequiredKeys<EnvironmentConfig['storage'], 'r2Bucket' | 'r2AccountId'>;
}

export interface StagingConfig extends EnvironmentConfig {
  environment: 'staging';
  features: {
    enableDebugMode: false;
    enableAnalytics: false;
    enableErrorTracking: true;
  };
}

// Type guards for environment checking
export const isDevelopmentConfig = (config: EnvironmentConfig): config is DevelopmentConfig => {
  return config.environment === 'development';
};

export const isProductionConfig = (config: EnvironmentConfig): config is ProductionConfig => {
  return config.environment === 'production';
};

export const isStagingConfig = (config: EnvironmentConfig): config is StagingConfig => {
  return config.environment === 'staging';
};

// Helper type for configuration validation
export interface ConfigValidationRule<T = any> {
  name: string;
  test: (config: EnvironmentConfig) => boolean;
  message: string;
  level: 'error' | 'warning';
  environment?: Environment[];
}

// Export utility type for component props that need config
export interface WithConfigProps {
  config?: Partial<EnvironmentConfig>;
}

// File structure constants for type safety
export const CONFIG_PATHS = {
  ENVIRONMENT: 'src/config/environment.ts',
  SECURITY: 'src/utils/security.ts',
  BUILD: 'build.config.ts',
  TYPES: 'src/types/config.ts',
} as const;

export type ConfigPath = typeof CONFIG_PATHS[keyof typeof CONFIG_PATHS];