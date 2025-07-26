// build.config.ts
/**
 * Build Optimization Configuration for PDfree.tools
 * Configures Vite/Next.js build settings based on environment
 */

import { getConfig } from './src/config/environment';
import type { EnvironmentConfig } from './src/config/environment';

export interface BuildOptimizationConfig {
  minify: boolean;
  sourceMaps: boolean;
  bundleAnalyzer: boolean;
  treeShaking: boolean;
  codeSplitting: boolean; // Fixed naming consistency
  compression: boolean;
  imageOptimization: boolean;
  cssOptimization: boolean;
  deadCodeElimination: boolean;
  modulePreload: boolean;
  rollupOptions?: {
    output?: {
      manualChunks?: (id: string) => string | undefined;
      chunkFileNames?: string;
      entryFileNames?: string;
      assetFileNames?: string;
    };
  };
}

export const generateBuildConfig = (config: EnvironmentConfig): BuildOptimizationConfig => {
  const isProd = config.environment === 'production';
  const isDev = config.environment === 'development';
  const isStaging = config.environment === 'staging';

  const buildConfig: BuildOptimizationConfig = {
    minify: !isDev,
    sourceMaps: isDev || isStaging,
    bundleAnalyzer: process.env.ANALYZE === 'true',
    treeShaking: !isDev,
    codeSplitting: config.performance.enableCodeSplitting,
    compression: isProd,
    imageOptimization: config.performance.enableImageOptimization,
    cssOptimization: !isDev,
    deadCodeElimination: !isDev,
    modulePreload: isProd,
  };

  // Add Rollup configuration for code splitting
  if (buildConfig.codeSplitting) {
    buildConfig.rollupOptions = {
      output: {
        // Manual chunks for better caching
        manualChunks: (id: string) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            // PDF processing libraries
            if (id.includes('pdf-lib') || id.includes('pdfjs-dist')) {
              return 'pdf-vendor';
            }
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // UI libraries
            if (id.includes('lucide-react') || id.includes('clsx')) {
              return 'ui-vendor';
            }
            // Other vendors
            return 'vendor';
          }
          
          // Feature-based chunks
          if (id.includes('/tools/') || id.includes('/components/tools/')) {
            return 'tools';
          }
          if (id.includes('/workers/')) {
            return 'workers';
          }
          
          return undefined;
        },
        // Naming patterns for production
        chunkFileNames: isProd ? 'assets/[name]-[hash].js' : 'assets/[name].js',
        entryFileNames: isProd ? 'assets/[name]-[hash].js' : 'assets/[name].js',
        assetFileNames: isProd ? 'assets/[name]-[hash].[ext]' : 'assets/[name].[ext]',
      },
    };
  }

  return buildConfig;
};

// Vite configuration generator
export const generateViteConfig = () => {
  const config = getConfig();
  const buildConfig = generateBuildConfig(config);

  return {
    // Build configuration
    build: {
      minify: buildConfig.minify ? 'esbuild' : false,
      sourcemap: buildConfig.sourceMaps,
      target: 'es2020',
      rollupOptions: buildConfig.rollupOptions,
      chunkSizeWarningLimit: config.performance.chunkSizeWarning * 1024, // Convert KB to bytes
      assetsInlineLimit: 4096, // 4KB
      cssCodeSplit: buildConfig.codeSplitting,
      reportCompressedSize: buildConfig.compression,
      emptyOutDir: true,
    },
    
    // Development server
    server: {
      port: 3000,
      host: true,
      open: false,
      cors: true,
      headers: config.environment === 'development' ? {} : undefined,
    },
    
    // Preview server (for production builds)
    preview: {
      port: 3000,
      host: true,
      cors: true,
    },
    
    // Plugin configuration
    plugins: [
      // Bundle analyzer (conditional)
      ...(buildConfig.bundleAnalyzer ? [
        // Add bundle analyzer plugin here
      ] : []),
    ],
    
    // Optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
      ],
      exclude: [
        'pdf-lib', // Heavy library - load on demand
        'pdfjs-dist', // Heavy library - load on demand
      ],
    },
    
    // Define global constants
    define: {
      'process.env.NODE_ENV': JSON.stringify(config.environment),
      '__DEV__': config.environment === 'development',
      '__PROD__': config.environment === 'production',
      '__VERSION__': JSON.stringify(config.app.version),
    },
    
    // Worker configuration
    worker: {
      format: 'es' as const,
      plugins: [],
    },
    
    // CSS configuration
    css: {
      devSourcemap: buildConfig.sourceMaps,
      preprocessorOptions: {
        scss: {
          additionalData: `@import "./src/styles/variables.scss";`,
        },
      },
    },
  };
};

// Next.js configuration generator (alternative to Vite)
export const generateNextConfig = () => {
  const config = getConfig();
  const buildConfig = generateBuildConfig(config);

  return {
    // Build configuration
    productionBrowserSourceMaps: buildConfig.sourceMaps,
    optimizeFonts: true,
    compress: buildConfig.compression,
    poweredByHeader: false,
    
    // Bundle analyzer
    ...(buildConfig.bundleAnalyzer && {
      webpack: (config: any, { isServer }: { isServer: boolean }) => {
        if (!isServer) {
          const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
          config.plugins.push(
            new BundleAnalyzerPlugin({
              analyzerMode: 'static',
              openAnalyzer: false,
              reportFilename: '../bundle-analyzer-report.html',
            })
          );
        }
        return config;
      },
    }),
    
    // Image optimization
    images: {
      domains: config.storage.r2PublicUrl ? [new URL(config.storage.r2PublicUrl).hostname] : [],
      formats: ['image/webp', 'image/avif'],
      minimumCacheTTL: 31536000, // 1 year
    },
    
    // Security headers
    async headers() {
      const { generateNextHeaders } = await import('./src/utils/security');
      return [
        {
          source: '/(.*)',
          headers: generateNextHeaders(config),
        },
      ];
    },
    
    // Experimental features
    experimental: {
      optimizeCss: buildConfig.cssOptimization,
      scrollRestoration: true,
    },
    
    // Environment variables
    env: {
      CUSTOM_BUILD_ID: config.app.version,
    },
    
    // Webpack configuration
    webpack: (webpackConfig: any, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
      // Bundle splitting
      if (!dev && !isServer && buildConfig.codeSplitting) {
        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            // PDF libraries
            pdf: {
              test: /[\\/]node_modules[\\/](pdf-lib|pdfjs-dist)[\\/]/,
              name: 'pdf-vendor',
              priority: 20,
            },
            // React ecosystem
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react-vendor',
              priority: 15,
            },
            // Other vendors
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              priority: 10,
            },
          },
        };
      }
      
      // Source maps
      if (buildConfig.sourceMaps) {
        webpackConfig.devtool = dev ? 'eval-source-map' : 'source-map';
      }
      
      return webpackConfig;
    },
  };
};

// Bundle size monitoring
export const checkBundleSize = (stats: any, config: EnvironmentConfig): string[] => {
  const warnings: string[] = [];
  const limitKB = config.performance.bundleSizeLimit;
  const warningKB = config.performance.chunkSizeWarning;
  
  if (stats && stats.chunks) {
    stats.chunks.forEach((chunk: any) => {
      const sizeKB = chunk.size / 1024;
      
      if (sizeKB > limitKB) {
        warnings.push(`Chunk ${chunk.names?.[0] || 'unknown'} (${Math.round(sizeKB)}KB) exceeds size limit (${limitKB}KB)`);
      } else if (sizeKB > warningKB) {
        warnings.push(`Chunk ${chunk.names?.[0] || 'unknown'} (${Math.round(sizeKB)}KB) exceeds warning threshold (${warningKB}KB)`);
      }
    });
  }
  
  return warnings;
};

// Performance budget validation
export const validatePerformanceBudget = (metrics: {
  bundleSize: number;
  chunkCount: number;
  assetCount: number;
}, config: EnvironmentConfig): { passed: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // Bundle size check
  if (metrics.bundleSize > config.performance.bundleSizeLimit * 1024) {
    issues.push(`Total bundle size (${Math.round(metrics.bundleSize / 1024)}KB) exceeds limit (${config.performance.bundleSizeLimit}KB)`);
  }
  
  // Chunk count check (too many chunks can hurt performance)
  if (metrics.chunkCount > 50) {
    issues.push(`Too many chunks (${metrics.chunkCount}). Consider consolidating.`);
  }
  
  // Asset count check
  if (metrics.assetCount > 100) {
    issues.push(`Too many assets (${metrics.assetCount}). Consider bundling or lazy loading.`);
  }
  
  return {
    passed: issues.length === 0,
    issues,
  };
};

// Export default configuration based on detected environment
const config = getConfig();
export default generateBuildConfig(config);