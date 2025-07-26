module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000',
        'http://localhost:3000/pdf-to-word',
        'http://localhost:3000/compress-pdf',
        'http://localhost:3000/merge-pdf',
        'http://localhost:3000/split-pdf',
      ],
      startServerCommand: 'npm run build && npm run start',
      startServerReadyPattern: 'ready -', // Matches Next.js "ready -" log line
      numberOfRuns: 3,
      startServerReadyTimeout: 120000, // 2 minutes for build + start
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
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};