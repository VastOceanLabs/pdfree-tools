import '@testing-library/jest-dom';

// Polyfills for Node.js environment if missing
import { TextEncoder, TextDecoder } from 'util';

if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder;
}
if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = TextDecoder;
}

// Mock IntersectionObserver
if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    disconnect() {}
    unobserve() {}
  };
}

// Mock ResizeObserver
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    constructor() {}
    observe() {}
    disconnect() {}
    unobserve() {}
  };
}

// Mock File API with proper size calculation
if (!globalThis.File) {
  globalThis.File = class File {
    constructor(chunks, filename, options = {}) {
      this.name = filename;
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
      
      // Better size calculation for different chunk types
      this.size = chunks.reduce((acc, chunk) => {
        if (chunk instanceof ArrayBuffer) return acc + chunk.byteLength;
        if (chunk instanceof Blob) return acc + chunk.size;
        if (typeof chunk === 'string') return acc + new Blob([chunk]).size;
        return acc + (chunk?.length || 0);
      }, 0);
    }
  };
}

// Mock URL.createObjectURL and revokeObjectURL
if (!globalThis.URL) {
  globalThis.URL = {};
}
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = jest.fn(() => 'mock-url');
}
if (!globalThis.URL.revokeObjectURL) {
  globalThis.URL.revokeObjectURL = jest.fn();
}

// Mock fetch
if (!globalThis.fetch) {
  globalThis.fetch = jest.fn();
}

// Mock Worker for PDF processing tests
if (!globalThis.Worker) {
  globalThis.Worker = class Worker {
    constructor() {
      this.onmessage = null;
      this.onerror = null;
    }
    postMessage() {}
    terminate() {}
  };
}

// Enhanced console for better test debugging
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    const msg = args?.[0];
    if (typeof msg === 'string') {
      // Filter out common React warnings in tests
      if (msg.includes('ReactDOM.render is no longer supported')) return;
      if (msg.includes('Warning: componentWillReceiveProps')) return;
      if (msg.includes('Warning: componentWillMount')) return;
    }
    return originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});