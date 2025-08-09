module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000',
       module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4173',
        'http://localhost:4173/pdf-to-word',
        'http://localhost:4173/compress-pdf',
        'http://localhost:4173/merge-pdf',
        'http://localhost:4173/split-pdf',
      ],
      startServerCommand: 'npm run build && npm run preview',
      startServerReadyPattern: 'Local:.*4173', // Matches Vite preview server output
      numberOfRuns: 3,
      startServerReadyTimeout: 120000, // 2 minutes for build + preview
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Core Web Vitals thresholds
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        
        // Specific Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        
        // Additional performance metrics
        'speed-index': ['error', { maxNumericValue: 3000 }],
        'interactive': ['error', { maxNumericValue: 3000 }],
        
        // Accessibility specific
        'color-contrast': ['error'],
        'image-alt': ['error'],
        'label': ['error'],
        'valid-lang': ['error'],
        
        // SEO specific
        'document-title': ['error'],
        'meta-description': ['error'],
        'viewport': ['error'],
        
        // Best practices
        'is-on-https': ['error'],
        'uses-text-compression': ['error'],
        'unused-css-rules': ['warn', { maxNumericValue: 20000 }], // Allow some unused CSS
        
        // Vite-specific optimizations to test
        'uses-rel-preload': ['warn'], // Vite handles module preloading
        'efficient-animated-content': ['warn'], // For PDF processing animations
        'non-composited-animations': ['warn'], // For smooth UI transitions
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
