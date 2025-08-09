import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Import worker explicitly so Vite bundles it correctly
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@lib/pdfjs': path.resolve(__dirname, 'src/lib/pdfjs.ts'),
      // Ensure pdfjs uses the correct worker
      'pdfjs-dist/build/pdf.worker.min.js': pdfWorker
    }
  },
  build: {
    target: 'es2022', // modern enough for PDF.js
    assetsInlineLimit: 0, // avoid inlining large PDFs
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('pdfjs-dist')) return 'pdfjs';
          if (id.includes('pdf-lib')) return 'pdf-lib';
        }
      }
    }
  },
  optimizeDeps: {
    include: ['pdf-lib', 'pdfjs-dist']
  }
});
