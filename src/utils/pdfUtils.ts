// src/utils/pdfUtils.ts
// Production-ready PDF utilities for PDfree.tools
// FIXED: Type safety, memory management, and API corrections

import { PDFDocument } from 'pdf-lib';

// === TYPES ===
export interface PDFProcessingOptions {
  /** Maximum file size in bytes (default: 100MB) */
  maxFileSize?: number;
  
  /** Maximum number of pages to process */
  maxPages?: number;
  
  /** Quality setting for compression (0.1 to 1.0) */
  quality?: number;
  
  /** Whether to preserve metadata */
  preserveMetadata?: boolean;
  
  /** Password for encrypted PDFs */
  password?: string;
  
  /** Progress callback for long operations */
  onProgress?: (progress: number) => void;
  
  /** Memory limit in bytes (default: 50MB) */
  memoryLimit?: number;
}

export interface MetadataOptions {
  preserveMetadata?: boolean;
  customMetadata?: Record<string, string>;
}

export interface PDFValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileSize: number;
  pageCount?: number;
  isEncrypted?: boolean;
  hasFormFields?: boolean;
  title?: string;
  author?: string;
}

export interface PDFProcessingResult<T = Uint8Array> {
  success: boolean;
  result?: T;
  error?: string;
  warnings?: string[];
  processingTime?: number;
  memoryUsed?: number;
  metadata?: {
    originalSize: number;
    processedSize: number;
    compressionRatio?: number;
    pageCount: number;
  };
  details?: Record<string, any>;
}

export interface PDFPageInfo {
  index: number;
  width: number;
  height: number;
  rotation: number;
  hasText: boolean;
  hasImages: boolean;
}

// === CONSTANTS ===
const DEFAULT_OPTIONS: Required<PDFProcessingOptions> = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxPages: 1000,
  quality: 0.8,
  preserveMetadata: true,
  password: '',
  onProgress: () => {},
  memoryLimit: 50 * 1024 * 1024 // 50MB
};

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/x-pdf',
  'application/acrobat',
  'application/vnd.pdf', // FIXED: was applications/vnd.pdf
  'text/pdf',
  'text/x-pdf'
];

const PDF_SIGNATURES = [
  new Uint8Array([0x25, 0x50, 0x44, 0x46]), // %PDF
];

// === ERROR CLASSES ===
export class PDFValidationError extends Error {
  constructor(message: string, public details?: Record<string, any>) {
    super(message);
    this.name = 'PDFValidationError';
  }
}

export class PDFProcessingError extends Error {
  constructor(message: string, public details?: Record<string, any>) {
    super(message);
    this.name = 'PDFProcessingError';
  }
}

export class PDFMemoryError extends Error {
  constructor(message: string, public memoryUsed?: number) {
    super(message);
    this.name = 'PDFMemoryError';
  }
}

// === BROWSER DETECTION ===
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const hasPerformanceMemory = isBrowser && 'performance' in window && 'memory' in (performance as any);

// === MEMORY MANAGEMENT ===
class MemoryManager {
  private static allocations = new Map<string, number>();
  private static maxMemory = DEFAULT_OPTIONS.memoryLimit;

  static setMaxMemory(limit: number): void {
    this.maxMemory = limit;
  }

  static getCurrentMemoryUsage(): number {
    if (hasPerformanceMemory) {
      try {
        return (performance as any).memory.usedJSHeapSize;
      } catch {
        // Fallback to estimated usage
      }
    }
    
    // Estimate from tracked allocations
    return Array.from(this.allocations.values()).reduce((sum, size) => sum + size, 0);
  }

  static trackAllocation(id: string, size: number): void {
    this.allocations.set(id, size);
    
    const totalMemory = this.getCurrentMemoryUsage();
    if (totalMemory > this.maxMemory) {
      throw new PDFMemoryError(
        `Memory limit exceeded: ${Math.round(totalMemory / 1024 / 1024)}MB / ${Math.round(this.maxMemory / 1024 / 1024)}MB`,
        totalMemory
      );
    }
  }

  static releaseAllocation(id: string): void {
    this.allocations.delete(id);
  }

  static forceGarbageCollection(): Promise<void> {
    return new Promise((resolve) => {
      // Request GC if available (Chrome with --js-flags=--expose-gc)
      if (isBrowser && typeof (window as any).gc === 'function') {
        try {
          (window as any).gc();
        } catch {
          // GC not available
        }
      }
      
      // Yield to allow natural GC
      setTimeout(resolve, 10);
    });
  }

  static cleanup(): void {
    this.allocations.clear();
  }
}

// === UTILITY FUNCTIONS ===
/**
 * Normalize ArrayBuffer to Uint8Array to avoid buffer slicing issues
 */
const normalizeToUint8Array = (data: ArrayBuffer | Uint8Array): Uint8Array => {
  if (data instanceof Uint8Array) {
    return data;
  }
  return new Uint8Array(data);
};

/**
 * Throttle progress callbacks to avoid UI jank
 */
const createThrottledProgress = (callback: (progress: number) => void, throttleMs = 100) => {
  let lastCall = 0;
  let lastProgress = -1;
  
  return (progress: number) => {
    const now = Date.now();
    if (progress === 100 || progress === 0 || now - lastCall >= throttleMs || Math.abs(progress - lastProgress) >= 5) {
      callback(progress);
      lastCall = now;
      lastProgress = progress;
    }
  };
};

// === FILE VALIDATION ===
export class PDFValidator {
  /**
   * Validate file before processing
   */
  static async validateFile(
    file: File | ArrayBuffer, 
    options: Partial<PDFProcessingOptions> = {}
  ): Promise<PDFValidationResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const result: PDFValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      fileSize: 0,
      isEncrypted: false // FIXED: Initialize explicitly
    };

    try {
      // Get file data
      let fileData: ArrayBuffer;
      let fileName = '';
      
      if (file instanceof File) {
        fileName = file.name;
        result.fileSize = file.size;
        
        // File size check
        if (file.size > opts.maxFileSize) {
          result.errors.push(`File too large: ${Math.round(file.size / 1024 / 1024)}MB (max: ${Math.round(opts.maxFileSize / 1024 / 1024)}MB)`);
        }
        
        if (file.size === 0) {
          result.errors.push('File is empty');
        }
        
        // MIME type check
        if (file.type && !SUPPORTED_MIME_TYPES.includes(file.type.toLowerCase())) {
          result.warnings.push(`Unsupported MIME type: ${file.type}`);
        }
        
        // File extension check
        if (!fileName.toLowerCase().endsWith('.pdf')) {
          result.warnings.push('File does not have .pdf extension');
        }
        
        fileData = await file.arrayBuffer();
      } else {
        fileData = file;
        result.fileSize = fileData.byteLength;
        
        if (fileData.byteLength > opts.maxFileSize) {
          result.errors.push(`File too large: ${Math.round(fileData.byteLength / 1024 / 1024)}MB`);
        }
      }

      // Magic number validation
      if (!this.validatePDFSignature(fileData)) {
        result.errors.push('Invalid PDF file signature');
      }

      // Try to parse with PDF-lib
      try {
        const pdfDoc = await PDFDocument.load(fileData);
        
        result.pageCount = pdfDoc.getPageCount();
        
        // Page count check
        if (result.pageCount > opts.maxPages) {
          result.errors.push(`Too many pages: ${result.pageCount} (max: ${opts.maxPages})`);
        }
        
        // Extract metadata
        try {
          result.title = pdfDoc.getTitle() || undefined;
          result.author = pdfDoc.getAuthor() || undefined;
        } catch {
          // Metadata extraction failed - not critical
        }
        
        // Check for form fields
        try {
          const form = pdfDoc.getForm();
          result.hasFormFields = form.getFields().length > 0;
        } catch {
          result.hasFormFields = false;
        }
        
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('password') || error.message.includes('encrypted')) {
            result.isEncrypted = true;
            result.errors.push('PDF is password protected');
          } else if (error.message.includes('corrupted') || error.message.includes('invalid')) {
            result.errors.push('PDF file appears to be corrupted');
          } else {
            result.errors.push(`Unable to parse PDF: ${error.message}`);
          }
        } else {
          result.errors.push('Unknown error while parsing PDF');
        }
      }

      result.isValid = result.errors.length === 0;
      return result;
      
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Validation failed');
      return result;
    }
  }

  /**
   * Check PDF magic number signature
   */
  private static validatePDFSignature(data: ArrayBuffer): boolean {
    const bytes = new Uint8Array(data.slice(0, 8));
    
    return PDF_SIGNATURES.some(signature => {
      if (bytes.length < signature.length) return false;
      
      for (let i = 0; i < signature.length; i++) {
        if (bytes[i] !== signature[i]) return false;
      }
      return true;
    });
  }

  /**
   * Estimate processing memory requirement
   */
  static estimateMemoryUsage(fileSize: number, pageCount?: number): number {
    // Conservative estimate: 3x file size + 2MB per page
    const baseMemory = fileSize * 3;
    const pageMemory = (pageCount || 10) * 2 * 1024 * 1024; // 2MB per page
    return baseMemory + pageMemory;
  }
}

// === PDF PROCESSING UTILITIES ===
export class PDFProcessor {
  /**
   * Load PDF document with error handling and memory tracking
   */
  static async loadDocument(
    data: ArrayBuffer, 
    options: Partial<PDFProcessingOptions> = {}
  ): Promise<PDFDocument> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const allocationId = `pdf-load-${Date.now()}`;
    
    // FIXED: Set memory limit from options
    MemoryManager.setMaxMemory(opts.memoryLimit);
    
    try {
      // Track memory allocation
      MemoryManager.trackAllocation(allocationId, data.byteLength);
      
      // Load document
      const loadOptions: any = {};
      if (opts.password) {
        loadOptions.password = opts.password;
      }
      
      const pdfDoc = await PDFDocument.load(data, loadOptions);
      
      // Validate page count
      const pageCount = pdfDoc.getPageCount();
      if (pageCount > opts.maxPages) {
        throw new PDFProcessingError(`Too many pages: ${pageCount} (max: ${opts.maxPages})`);
      }
      
      return pdfDoc;
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('password') || error.message.includes('encrypted')) {
          throw new PDFProcessingError('PDF is password protected', { requiresPassword: true });
        } else if (error.message.includes('corrupted')) {
          throw new PDFProcessingError('PDF file is corrupted or invalid');
        } else {
          throw new PDFProcessingError(`Failed to load PDF: ${error.message}`);
        }
      }
      
      throw new PDFProcessingError('Unknown error loading PDF');
    } finally {
      // FIXED: Always release allocation
      MemoryManager.releaseAllocation(allocationId);
    }
  }

  /**
   * Get detailed page information (FIXED: removed private API usage)
   */
  static async getPageInfo(pdfDoc: PDFDocument): Promise<PDFPageInfo[]> {
    const pages = pdfDoc.getPages();
    
    return pages.map((page, i) => {
      const { width, height } = page.getSize();
      
      // FIXED: Defensive rotation access
      let rotation = 0;
      try {
        const rotationObj = page.getRotation();
        rotation = (rotationObj as any)?.angle || 0;
      } catch {
        rotation = 0;
      }
      
      return {
        index: i,
        width,
        height,
        rotation,
        hasText: false, // Best-effort flag - would need content analysis
        hasImages: false // Best-effort flag - would need content analysis
      };
    });
  }

  /**
   * Optimize PDF metadata (FIXED: proper typing)
   */
  static optimizeMetadata(
    pdfDoc: PDFDocument, 
    { preserveMetadata = true, customMetadata = {} }: MetadataOptions = {}
  ): void {
    if (!preserveMetadata) {
      // Clear existing metadata
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setCreator('');
      pdfDoc.setProducer('');
    }
    
    // Set standard metadata
    pdfDoc.setCreator('PDfree.tools');
    pdfDoc.setProducer('PDfree.tools - Free PDF Processing');
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());
    
    // Apply custom metadata
    if (customMetadata.title) pdfDoc.setTitle(customMetadata.title);
    if (customMetadata.author) pdfDoc.setAuthor(customMetadata.author);
    if (customMetadata.subject) pdfDoc.setSubject(customMetadata.subject);
    if (customMetadata.keywords) {
      pdfDoc.setKeywords(customMetadata.keywords.split(',').map(k => k.trim()));
    }
  }

  /**
   * Save PDF with optimization options (FIXED: return Uint8Array)
   */
  static async saveDocument(
    pdfDoc: PDFDocument,
    options: {
      useObjectStreams?: boolean;
      addDefaultPage?: boolean;
      updateFieldAppearances?: boolean;
    } = {}
  ): Promise<Uint8Array> {
    const saveOptions = {
      useObjectStreams: options.useObjectStreams ?? true,
      addDefaultPage: options.addDefaultPage ?? false,
      updateFieldAppearances: options.updateFieldAppearances ?? true
    };
    
    try {
      return await pdfDoc.save(saveOptions);
    } catch (error) {
      throw new PDFProcessingError(
        `Failed to save PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Process PDF with comprehensive error handling (FIXED: return details)
   */
  static async processWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: Partial<PDFProcessingOptions> = {}
  ): Promise<PDFProcessingResult<T>> {
    const startTime = Date.now();
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // FIXED: Set memory limit
    MemoryManager.setMaxMemory(opts.memoryLimit);
    
    // FIXED: Create throttled progress callback
    const throttledProgress = createThrottledProgress(opts.onProgress);
    
    try {
      throttledProgress(0);
      
      const result = await operation();
      const processingTime = Date.now() - startTime;
      
      throttledProgress(100); // FIXED: Always complete progress
      
      return {
        success: true,
        result,
        processingTime,
        memoryUsed: MemoryManager.getCurrentMemoryUsage()
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      let errorMessage = `${operationName} failed`;
      let details: Record<string, any> = {};
      
      if (error instanceof PDFValidationError) {
        errorMessage = `Validation error: ${error.message}`;
        details = error.details || {};
      } else if (error instanceof PDFProcessingError) {
        errorMessage = error.message;
        details = error.details || {};
      } else if (error instanceof PDFMemoryError) {
        errorMessage = `Memory error: ${error.message}`;
        details = { memoryUsed: error.memoryUsed };
      } else if (error instanceof Error) {
        errorMessage = error.message;
        
        // Categorize common errors
        if (error.message.includes('password')) {
          details.requiresPassword = true;
        } else if (error.message.includes('corrupted')) {
          details.corrupted = true;
        } else if (error.message.includes('memory')) {
          details.memoryIssue = true;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        processingTime,
        memoryUsed: MemoryManager.getCurrentMemoryUsage(),
        details // FIXED: Return details
      };
    } finally {
      // Cleanup
      await MemoryManager.forceGarbageCollection();
    }
  }
}

// === SPECIALIZED PDF OPERATIONS ===
export class PDFOperations {
  /**
   * Merge multiple PDFs (FIXED: metadata options and progress completion)
   */
  static async mergePDFs(
    files: ArrayBuffer[],
    options: Partial<PDFProcessingOptions> = {}
  ): Promise<PDFProcessingResult<Uint8Array>> {
    return PDFProcessor.processWithErrorHandling(async () => {
      const mergedPdf = await PDFDocument.create();
      const totalFiles = files.length;
      let totalOriginalSize = 0;
      
      const throttledProgress = createThrottledProgress(options.onProgress || (() => {}));
      
      for (let i = 0; i < files.length; i++) {
        const fileData = files[i];
        totalOriginalSize += fileData.byteLength;
        
        const sourcePdf = await PDFProcessor.loadDocument(fileData, options);
        const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        
        pages.forEach(page => mergedPdf.addPage(page));
        
        // Progress update (reserve 10% for saving)
        throttledProgress((i + 1) / totalFiles * 90);
      }
      
      // FIXED: Use proper metadata options
      PDFProcessor.optimizeMetadata(mergedPdf, { 
        preserveMetadata: options.preserveMetadata,
        customMetadata: { title: 'Merged PDF' }
      });
      
      throttledProgress(95);
      const result = await PDFProcessor.saveDocument(mergedPdf);
      
      // FIXED: Complete progress
      throttledProgress(100);
      
      // Add metadata to result
      const processedResult = result as Uint8Array & { metadata?: any };
      processedResult.metadata = {
        originalSize: totalOriginalSize,
        processedSize: result.byteLength,
        pageCount: mergedPdf.getPageCount()
      };
      
      return result;
    }, 'PDF merge', options);
  }

  /**
   * Split PDF by page ranges (FIXED: metadata options)
   */
  static async splitPDF(
    fileData: ArrayBuffer,
    pageRanges: string,
    options: Partial<PDFProcessingOptions> = {}
  ): Promise<PDFProcessingResult<Uint8Array[]>> {
    return PDFProcessor.processWithErrorHandling(async () => {
      const sourcePdf = await PDFProcessor.loadDocument(fileData, options);
      const totalPages = sourcePdf.getPageCount();
      const ranges = this.parsePageRanges(pageRanges, totalPages);
      const results: Uint8Array[] = [];
      
      const throttledProgress = createThrottledProgress(options.onProgress || (() => {}));
      
      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        const newPdf = await PDFDocument.create();
        
        const pageIndices = range.map(pageNum => pageNum - 1);
        const pages = await newPdf.copyPages(sourcePdf, pageIndices);
        pages.forEach(page => newPdf.addPage(page));
        
        // FIXED: Use proper metadata options
        PDFProcessor.optimizeMetadata(newPdf, { 
          preserveMetadata: options.preserveMetadata,
          customMetadata: { title: `Split PDF - Part ${i + 1}` }
        });
        
        const pdfBytes = await PDFProcessor.saveDocument(newPdf);
        results.push(pdfBytes);
        
        throttledProgress((i + 1) / ranges.length * 100);
      }
      
      return results;
    }, 'PDF split', options);
  }

  /**
   * Rotate PDF pages (FIXED: metadata options)
   */
  static async rotatePDF(
    fileData: ArrayBuffer,
    rotation: 90 | 180 | 270,
    pageIndices?: number[],
    options: Partial<PDFProcessingOptions> = {}
  ): Promise<PDFProcessingResult<Uint8Array>> {
    return PDFProcessor.processWithErrorHandling(async () => {
      const pdfDoc = await PDFProcessor.loadDocument(fileData, options);
      const pages = pdfDoc.getPages();
      const pagesToRotate = pageIndices || pages.map((_, i) => i);
      
      const throttledProgress = createThrottledProgress(options.onProgress || (() => {}));
      
      // Import degrees from pdf-lib dynamically to avoid import issues
      const { degrees } = await import('pdf-lib');
      
      for (let i = 0; i < pagesToRotate.length; i++) {
        const pageIndex = pagesToRotate[i];
        if (pageIndex >= 0 && pageIndex < pages.length) {
          pages[pageIndex].setRotation(degrees(rotation));
        }
        
        throttledProgress((i + 1) / pagesToRotate.length * 90);
      }
      
      // FIXED: Use proper metadata options
      PDFProcessor.optimizeMetadata(pdfDoc, { 
        preserveMetadata: options.preserveMetadata,
        customMetadata: { title: 'Rotated PDF' }
      });
      
      throttledProgress(95);
      const result = await PDFProcessor.saveDocument(pdfDoc);
      throttledProgress(100);
      
      return result;
    }, 'PDF rotation', options);
  }

  /**
   * Basic PDF compression (FIXED: return compression ratio in metadata)
   */
  static async compressPDF(
    fileData: ArrayBuffer,
    options: Partial<PDFProcessingOptions> = {}
  ): Promise<PDFProcessingResult<Uint8Array>> {
    return PDFProcessor.processWithErrorHandling(async () => {
      const pdfDoc = await PDFProcessor.loadDocument(fileData, options);
      const originalSize = fileData.byteLength;
      
      const throttledProgress = createThrottledProgress(options.onProgress || (() => {}));
      
      throttledProgress(25);
      
      // Optimize metadata (remove unnecessary data)
      PDFProcessor.optimizeMetadata(pdfDoc, { 
        preserveMetadata: false,
        customMetadata: { title: 'Compressed PDF' }
      });
      
      throttledProgress(75);
      
      // Save with compression options
      const compressed = await PDFProcessor.saveDocument(pdfDoc, {
        useObjectStreams: true,
        addDefaultPage: false
      });
      
      throttledProgress(100);
      
      // FIXED: Calculate and return compression ratio
      const compressionRatio = compressed.byteLength / originalSize;
      
      const result = compressed as Uint8Array & { metadata?: any };
      result.metadata = {
        originalSize,
        processedSize: compressed.byteLength,
        compressionRatio,
        pageCount: pdfDoc.getPageCount()
      };
      
      return compressed;
    }, 'PDF compression', options);
  }

  /**
   * Parse page ranges string (e.g., "1-3,5,7-9")
   */
  private static parsePageRanges(ranges: string, totalPages: number): number[][] {
    const result: number[][] = [];
    const parts = ranges.split(',').map(part => part.trim());
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim()));
        if (start >= 1 && end <= totalPages && start <= end) {
          const range: number[] = [];
          for (let i = start; i <= end; i++) {
            range.push(i);
          }
          result.push(range);
        }
      } else {
        const pageNum = parseInt(part);
        if (pageNum >= 1 && pageNum <= totalPages) {
          result.push([pageNum]);
        }
      }
    }
    
    return result;
  }
}

// === UTILITY FUNCTIONS ===
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const sizeIndex = Math.min(i, sizes.length - 1);
  
  return parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(2)) + ' ' + sizes[sizeIndex];
};

export const createPDFBlob = (data: Uint8Array): Blob => {
  return new Blob([data], { type: 'application/pdf' });
};

// FIXED: More defensive browser checking
export const downloadPDF = (data: Uint8Array, filename: string): void => {
  if (!isBrowser) {
    throw new Error('Download not available in server environment');
  }
  
  const blob = createPDFBlob(data);
  const url = URL.createObjectURL(blob);
  
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    // Cleanup URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

/**
 * High-level pipeline helper for common operations
 */
export const processPDFPipeline = async (
  operation: 'merge' | 'split' | 'rotate' | 'compress',
  files: ArrayBuffer | ArrayBuffer[],
  operationOptions: any = {},
  processingOptions: Partial<PDFProcessingOptions> = {}
): Promise<PDFProcessingResult<Uint8Array | Uint8Array[]>> => {
  switch (operation) {
    case 'merge':
      if (!Array.isArray(files)) {
        throw new PDFProcessingError('Merge operation requires array of files');
      }
      return PDFOperations.mergePDFs(files, processingOptions);
      
    case 'split':
      if (Array.isArray(files)) {
        throw new PDFProcessingError('Split operation requires single file');
      }
      return PDFOperations.splitPDF(files, operationOptions.pageRanges || '1', processingOptions);
      
    case 'rotate':
      if (Array.isArray(files)) {
        throw new PDFProcessingError('Rotate operation requires single file');
      }
      return PDFOperations.rotatePDF(
        files, 
        operationOptions.rotation || 90, 
        operationOptions.pageIndices,
        processingOptions
      );
      
    case 'compress':
      if (Array.isArray(files)) {
        throw new PDFProcessingError('Compress operation requires single file');
      }
      return PDFOperations.compressPDF(files, processingOptions);
      
    default:
      throw new PDFProcessingError(`Unknown operation: ${operation}`);
  }
};

// === CLEANUP UTILITIES ===
export const cleanup = (): void => {
  MemoryManager.cleanup();
};

// === EXPORTS ===
export default {
  validator: PDFValidator,
  processor: PDFProcessor,
  operations: PDFOperations,
  memory: MemoryManager,
  formatFileSize,
  createPDFBlob,
  downloadPDF,
  processPDFPipeline,
  cleanup
};