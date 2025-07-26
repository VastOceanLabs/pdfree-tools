// src/config/environment.ts
/**
 * Environment Configuration System for PDfree.tools
 * Main configuration logic - server and client compatible
 */

export type Environment = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  environment: Environment;
  app: {
    name: string;
    version: string;
    domain: string;
    baseUrl: string;
    supportEmail: string;
  };
  features: {
    enableAnalytics: boolean;
    enableErrorTracking: boolean;
    enablePerformanceMonitoring: boolean;
    enableDebugMode: boolean;
    enableServiceWorker: boolean;
    maxFileSize: number; // bytes
    maxConcurrentUploads: number;
    fileRetentionHours: number;
  };
  storage: {
    r2Bucket: string;
    r2AccountId: string;
    r2PublicUrl: string;
    presignedUrlExpiry: number; // seconds
  };
  monitoring: {
    sentryDsn?: string;
    plausibleDomain?: string;
    plausibleApiHost?: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  security: {
    cspEnabled: boolean;
    corsOrigins: string[];
    rateLimitWindow: number; // milliseconds
    rateLimitMax: number;
    enableTurnstile: boolean;
    turnstileSiteKey?: string;
  };
  api: {
    timeout: number; // milliseconds
    retryAttempts: number;
    retryDelay: number; // milliseconds
  };
  performance: {
    enableLazyLoading: boolean;
    enableCodeSplitting: boolean;
    enableImageOptimization: boolean;
    bundleSizeLimit: number; // KB
    chunkSizeWarning: number; // KB
  };
}

// Fixed environment detection with proper fallback chain
const getEnvironment = (): Environment => {
  // Check NEXT_PUBLIC_ENV first (available at build time and runtime)
  const fromPublic = process.env.NEXT_PUBLIC_ENV as Environment | undefined;
  const fromNode = process.env.NODE_ENV as Environment | undefined;
  
  // Browser override (for testing/debugging)
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__;
  }
  
  // Prefer public env var (works in edge runtime)
  if (fromPublic === 'development' || fromPublic === 'staging' || fromPublic === 'production') {
    return fromPublic;
  }
  
  // Fallback to NODE_ENV
  if (fromNode === 'development' || fromNode === 'staging' || fromNode === 'production') {
    return fromNode;
  }
  
  // Default to production for safety
  return 'production';
};

// Version detection from package.json or build
const getVersion = (): string => {
  return process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
};

// Domain detection with fallback
const getDomain = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return process.env.NEXT_PUBLIC_DOMAIN || 'pdffree.tools';
};

// Base configuration factory
const createBaseConfig = (env: Environment): EnvironmentConfig => ({
  environment: env,
  app: {
    name: 'PDfree.tools',
    version: getVersion(),
    domain: getDomain(),
    baseUrl: env === 'development' 
      ? 'http://localhost:3000' 
      : `https://${getDomain()}`,
    supportEmail: 'support@pdffree.tools',
  },
  features: {
    enableAnalytics: env === 'production',
    enableErrorTracking: env !== 'development',
    enablePerformanceMonitoring: env === 'production',
    enableDebugMode: env === 'development',
    enableServiceWorker: env === 'production',
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxConcurrentUploads: 3,
    fileRetentionHours: 1,
  },
  storage: {
    r2Bucket: process.env.NEXT_PUBLIC_R2_BUCKET || '',
    r2AccountId: process.env.NEXT_PUBLIC_R2_ACCOUNT_ID || '',
    r2PublicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '',
    presignedUrlExpiry: 3600, // 1 hour
  },
  monitoring: {
    sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    plausibleDomain: getDomain(),
    plausibleApiHost: process.env.NEXT_PUBLIC_PLAUSIBLE_HOST,
    logLevel: env === 'development' ? 'debug' : 'info',
  },
  security: {
    cspEnabled: env === 'production',
    corsOrigins: env === 'development' 
      ? ['http://localhost:3000', 'http://localhost:3001']
      : [`https://${getDomain()}`],
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: env === 'development' ? 1000 : 100,
    enableTurnstile: env === 'production',
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  },
  api: {
    timeout: env === 'development' ? 30000 : 15000,
    retryAttempts: env === 'development' ? 1 : 3,
    retryDelay: 1000,
  },
  performance: {
    enableLazyLoading: true,
    enableCodeSplitting: env !== 'development',
    enableImageOptimization: env === 'production',
    bundleSizeLimit: 500, // 500KB
    chunkSizeWarning: 200, // 200KB
  },
});

// Environment-specific overrides
const environmentOverrides: Record<Environment, Partial<EnvironmentConfig>> = {
  development: {
    features: {
      enableAnalytics: false,
      enableErrorTracking: false,
      enablePerformanceMonitoring: false,
      enableDebugMode: true,
      enableServiceWorker: false,
      maxFileSize: 50 * 1024 * 1024, // 50MB for dev
      maxConcurrentUploads: 5,
      fileRetentionHours: 2, // Keep files longer in dev
    },
    monitoring: {
      logLevel: 'debug',
    },
    security: {
      cspEnabled: false, // Easier debugging
      rateLimitMax: 1000, // Higher limits for dev
      enableTurnstile: false,
    },
    performance: {
      enableCodeSplitting: false, // Faster dev builds
      bundleSizeLimit: 1000, // Relaxed in dev
    },
  },
  staging: {
    features: {
      enableAnalytics: false, // No analytics on staging
      enableErrorTracking: true,
      enablePerformanceMonitoring: true,
      enableDebugMode: false,
      enableServiceWorker: true,
    },
    monitoring: {
      logLevel: 'info',
    },
    security: {
      cspEnabled: true,
      rateLimitMax: 200, // Medium limits for staging
      enableTurnstile: true,
    },
  },
  production: {
    features: {
      enableAnalytics: true,
      enableErrorTracking: true,
      enablePerformanceMonitoring: true,
      enableDebugMode: false,
      enableServiceWorker: true,
    },
    monitoring: {
      logLevel: 'warn', // Only warnings and errors in prod
    },
    security: {
      cspEnabled: true,
      rateLimitMax: 100, // Strict limits for prod
      enableTurnstile: true,
    },
    performance: {
      enableCodeSplitting: true,
      enableImageOptimization: true,
    },
  },
};

// Create final configuration with deep merge
export const createEnvironmentConfig = (): EnvironmentConfig => {
  const env = getEnvironment();
  const baseConfig = createBaseConfig(env);
  const overrides = environmentOverrides[env];
  
  // Deep merge configuration
  const mergeConfig = (base: any, override: any): any => {
    const result = { ...base };
    
    for (const key in override) {
      if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
        result[key] = mergeConfig(base[key] || {}, override[key]);
      } else {
        result[key] = override[key];
      }
    }
    
    return result;
  };
  
  return mergeConfig(baseConfig, overrides);
};

// Singleton instance
let configInstance: EnvironmentConfig | null = null;

export const getConfig = (): EnvironmentConfig => {
  if (!configInstance) {
    configInstance = createEnvironmentConfig();
  }
  return configInstance;
};

// Configuration validation with correct env var names
export const validateConfig = (config: EnvironmentConfig): string[] => {
  const errors: string[] = [];
  
  // Required environment variables for production
  if (config.environment === 'production') {
    if (!config.storage.r2Bucket) {
      errors.push('NEXT_PUBLIC_R2_BUCKET is required in production');
    }
    if (!config.storage.r2AccountId) {
      errors.push('NEXT_PUBLIC_R2_ACCOUNT_ID is required in production');
    }
    if (!config.monitoring.sentryDsn) {
      errors.push('NEXT_PUBLIC_SENTRY_DSN is recommended in production');
    }
    if (config.security.enableTurnstile && !config.security.turnstileSiteKey) {
      errors.push('NEXT_PUBLIC_TURNSTILE_SITE_KEY is required when Turnstile is enabled');
    }
  }
  
  // Validation checks
  if (config.features.maxFileSize <= 0) {
    errors.push('maxFileSize must be greater than 0');
  }
  
  if (config.features.maxConcurrentUploads <= 0) {
    errors.push('maxConcurrentUploads must be greater than 0');
  }
  
  if (config.api.timeout <= 0) {
    errors.push('API timeout must be greater than 0');
  }
  
  return errors;
};

// Utility functions
export const isDevelopment = (): boolean => getConfig().environment === 'development';
export const isProduction = (): boolean => getConfig().environment === 'production';
export const isStaging = (): boolean => getConfig().environment === 'staging';

// Feature flags
export const isFeatureEnabled = (feature: keyof EnvironmentConfig['features']): boolean => {
  return getConfig().features[feature] as boolean;
};

// Debug utility
export const logConfig = (): void => {
  const config = getConfig();
  if (config.features.enableDebugMode) {
    console.group('🔧 Environment Configuration');
    console.log('Environment:', config.environment);
    console.log('Domain:', config.app.domain);
    console.log('Version:', config.app.version);
    console.log('Features:', config.features);
    console.log('Performance:', config.performance);
    console.groupEnd();
  }
};

// Export the configuration instance
export const config = getConfig();

// Initialize configuration and set up global error handling (client-side only)
export const initializeEnvironment = (): void => {
  const config = getConfig();
  
  // Validate configuration
  const errors = validateConfig(config);
  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    
    if (config.environment === 'production') {
      throw new Error('Invalid production configuration');
    }
  }
  
  // Log configuration in development
  if (config.features.enableDebugMode) {
    logConfig();
  }
  
  // Set global error handler (client-side only)
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      if (isFeatureEnabled('enableErrorTracking')) {
        // Fixed error handling for different reason types
        import('@/lib/observability').then(({ trackError }) => {
          const reason = event.reason;
          const err = reason instanceof Error 
            ? reason 
            : new Error(typeof reason === 'string' ? reason : JSON.stringify(reason));
          trackError(err, 'unhandled_promise_rejection');
        }).catch(console.error);
      }
    });
  }
};

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEnvironment);
  } else {
    initializeEnvironment();
  }
}