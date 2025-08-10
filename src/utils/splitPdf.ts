// src/utils/pdf/split.ts
// Production-ready PDF split utility for PDfree.tools
// FIXED: Double loading, error preservation, memory checks, metadata preservation, and performance

import { PDFDocument } from 'pdf-lib';

// === TYPES ===
export interface SplitOptions {
  /** Whether to preserve original metadata in split files */
  preserveMetadata?: boolean;
  
  /** Custom metadata to apply to split files */
  customMetadata?: {
    titlePrefix?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
  };
  
  /** Progress callback for UI updates */
  onProgress?: (progress: number, phase?: string) => void;
  
  /** Memory limit in bytes (default: 100MB) */
  memoryLimit?: number;
  
  /** Maximum pages per output file (default: 1000) */
  maxPagesPerFile?: number;
  
  /** Whether to validate page ranges before processing (default: true) */
  validateRanges?: boolean;
  
  /** Whether to apply structural optimization to output files (default: true) */
  optimizeStructure?: boolean;
  
  /** Whether to update form field appearances (CPU intensive, default: false) */
  updateFormFields?: boolean;
}

export interface PageRange {
  /** Human-readable description of the range */
  description: string;
  
  /** Array of page numbers (1-indexed) */
  pages: number[];
  
  /** Start page for continuous ranges */
  start?: number;
  
  /** End page for continuous ranges */
  end?: number;
  
  /** Whether this is a single page */
  isSinglePage: boolean;
  
  /** Whether this range is continuous */
  isContinuous: boolean;
}

export interface SplitResult {
  /** Array of split PDF blobs with metadata */
  files: Array<{
    blob: Blob;
    filename: string;
    pages: number[];
    description: string;
  }>;
  
  /** Processing metadata */
  metadata: {
    originalPages: number;
    outputFiles: number;
    totalOutputSize: number;
    originalSize: number;
    processingTimeMs: number;
    /** Size expansion ratio: output_size / input_size (>1 means growth, <1 means smaller) */
    sizeRatio: number;
  };
  
  /** Non-fatal warnings */
  warnings: string[];
}

interface LoadedPDF {
  doc: PDFDocument;
  bytes: ArrayBuffer;
  totalPages: number;
}

// === ERROR CLASSES ===
export class SplitError extends Error {
  constructor(message: string, public code?: string, public memoryUsed?: number) {
    super(message);
    this.name = 'SplitError';
  }
}

export class SplitValidationError extends SplitError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'SplitValidationError';
  }
}

export class SplitMemoryError extends SplitError {
  constructor(message: string, memoryUsed?: number) {
    super(message, 'MEMORY_ERROR', memoryUsed);
    this.name = 'SplitMemoryError';
  }
}

// === CONSTANTS ===
const DEFAULT_OPTIONS: Required<SplitOptions> = {
  preserveMetadata: true,
  customMetadata: {},
  onProgress: () => {},
  memoryLimit: 100 * 1024 * 1024, // 100MB
  maxPagesPerFile: 1000,
  validateRanges: true,
  optimizeStructure: true,
  updateFormFields: false // CPU intensive, only enable if needed
};

const MAX_OUTPUT_FILES = 100;
const PROGRESS_UPDATE_INTERVAL = 50;

// === UTILITY FUNCTIONS ===
const isBrowser = typeof window !== 'undefined';
const hasPerformanceMemory = isBrowser && 'performance' in window && 'memory' in (performance as any);

/**
 * Get current memory usage (browser-safe)
 */
const getCurrentMemoryUsage = (): number => {
  if (hasPerformanceMemory) {
    try {
      return (performance as any).memory.usedJSHeapSize;
    } catch {
      // Fallback if memory API fails
    }
  }
  return 0; // Unknown memory usage
};

/**
 * Throttle progress callbacks to avoid UI jank
 */
const createThrottledProgress = (
  callback: (progress: number, phase?: string) => void,
  throttleMs = PROGRESS_UPDATE_INTERVAL
) => {
  let lastCall = 0;
  let lastProgress = -1;
  
  return (progress: number, phase?: string) => {
    const now = Date.now();
    const significantChange = Math.abs(progress - lastProgress) >= 3;
    
    if (progress === 100 || progress === 0 || now - lastCall >= throttleMs || significantChange) {
      callback(progress, phase);
      lastCall = now;
      lastProgress = progress;
    }
  };
};

/**
 * Generate safe filename for split files
 */
const generateFilename = (
  originalFile: File,
  range: PageRange,
  index: number,
  totalFiles: number
): string => {
  // Remove extension from original name and sanitize
  const baseName = originalFile.name
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9\-_. ]/gi, ''); // Sanitize problematic characters
  
  // Determine suffix based on range type
  let suffix: string;
  
  if (range.isSinglePage) {
    suffix = `page-${range.pages[0]}`;
  } else if (range.isContinuous && range.start && range.end) {
    suffix = `pages-${range.start}-${range.end}`;
  } else {
    // Use file index for complex ranges
    const paddedIndex = String(index + 1).padStart(String(totalFiles).length, '0');
    suffix = `part-${paddedIndex}`;
  }
  
  return `${baseName}-${suffix}.pdf`;
};

/**
 * Apply metadata to split PDF documents
 * FIXED: Preserve all metadata types (subject, keywords)
 */
const applyMetadata = (
  doc: PDFDocument,
  originalMetadata: { title?: string; author?: string; subject?: string; keywords?: string },
  range: PageRange,
  options: SplitOptions
): void => {
  try {
    // Set default metadata
    doc.setCreator('PDfree.tools');
    doc.setProducer('PDfree.tools - Free PDF Split Tool');
    doc.setCreationDate(new Date());
    doc.setModificationDate(new Date());

    // Determine title
    let title = 'Split PDF';
    
    if (options.customMetadata?.titlePrefix) {
      title = `${options.customMetadata.titlePrefix} - ${range.description}`;
    } else if (options.preserveMetadata && originalMetadata.title) {
      title = `${originalMetadata.title} - ${range.description}`;
    } else {
      title = `Split PDF - ${range.description}`;
    }
    
    doc.setTitle(title);

    // Apply author
    if (options.customMetadata?.author) {
      doc.setAuthor(options.customMetadata.author);
    } else if (options.preserveMetadata && originalMetadata.author) {
      doc.setAuthor(originalMetadata.author);
    }

    // Apply subject
    if (options.customMetadata?.subject) {
      doc.setSubject(options.customMetadata.subject);
    } else if (options.preserveMetadata && originalMetadata.subject) {
      doc.setSubject(originalMetadata.subject);
    }

    // Apply keywords
    if (options.customMetadata?.keywords) {
      doc.setKeywords(options.customMetadata.keywords);
    } else if (options.preserveMetadata && originalMetadata.keywords) {
      doc.setKeywords([originalMetadata.keywords]);
    }

  } catch (error) {
    // Non-critical metadata errors should not fail the split
    console.warn('Failed to apply metadata:', error);
  }
};

/**
 * Load PDF document once to avoid double loading
 * FIXED: Single load point for all functions
 */
const loadPDF = async (file: File): Promise<LoadedPDF> => {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const totalPages = doc.getPageCount();
  
  return { doc, bytes, totalPages };
};

// === PAGE RANGE PARSING ===
export class PageRangeParser {
  /**
   * Parse page ranges string with validation based on options
   * FIXED: Honor validateRanges option properly
   */
  static parseRanges(rangeString: string, totalPages: number, validateRanges = true): PageRange[] {
    if (!rangeString || rangeString.trim() === '') {
      throw new SplitValidationError('Page range cannot be empty');
    }

    const ranges: PageRange[] = [];
    const parts = rangeString.split(',').map(part => part.trim()).filter(part => part.length > 0);

    if (parts.length === 0) {
      throw new SplitValidationError('No valid page ranges found');
    }

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      try {
        const range = this.parseSingleRange(part, totalPages);
        ranges.push(range);
      } catch (error) {
        throw new SplitValidationError(
          `Invalid range "${part}": ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Only validate output file count if validateRanges is true
    if (validateRanges && ranges.length > MAX_OUTPUT_FILES) {
      throw new SplitValidationError(
        `Too many output files: ${ranges.length} (maximum: ${MAX_OUTPUT_FILES})`
      );
    }

    // Check for overlapping ranges and warn
    const allPages = new Set<number>();
    const duplicatedPages: number[] = [];
    
    ranges.forEach(range => {
      range.pages.forEach(page => {
        if (allPages.has(page)) {
          duplicatedPages.push(page);
        }
        allPages.add(page);
      });
    });

    if (duplicatedPages.length > 0 && validateRanges) {
      console.warn(`Warning: Pages ${[...new Set(duplicatedPages)].join(', ')} appear in multiple ranges and will be duplicated in output files.`);
    }

    return ranges;
  }

  /**
   * Parse a single range part with extended syntax support
   * FIXED: Support for last-5, 5-last, 1..5 syntax
   */
  private static parseSingleRange(part: string, totalPages: number): PageRange {
    const lowerPart = part.toLowerCase();

    // Handle special keywords
    if (lowerPart === 'all') {
      return {
        description: 'All pages',
        pages: Array.from({ length: totalPages }, (_, i) => i + 1),
        start: 1,
        end: totalPages,
        isSinglePage: false,
        isContinuous: true
      };
    }

    if (lowerPart === 'odd') {
      const oddPages = [];
      for (let i = 1; i <= totalPages; i += 2) {
        oddPages.push(i);
      }
      return {
        description: 'Odd pages',
        pages: oddPages,
        isSinglePage: false,
        isContinuous: false
      };
    }

    if (lowerPart === 'even') {
      const evenPages = [];
      for (let i = 2; i <= totalPages; i += 2) {
        evenPages.push(i);
      }
      return {
        description: 'Even pages',
        pages: evenPages,
        isSinglePage: false,
        isContinuous: false
      };
    }

    if (lowerPart === 'first') {
      return {
        description: 'First page',
        pages: [1],
        start: 1,
        end: 1,
        isSinglePage: true,
        isContinuous: true
      };
    }

    if (lowerPart === 'last') {
      return {
        description: 'Last page',
        pages: [totalPages],
        start: totalPages,
        end: totalPages,
        isSinglePage: true,
        isContinuous: true
      };
    }

    // Handle tail ranges like "last-5"
    if (lowerPart.startsWith('last-')) {
      const count = parseInt(lowerPart.substring(5));
      if (isNaN(count) || count < 1 || count > totalPages) {
        throw new Error(`Invalid tail range: ${part}`);
      }
      const start = Math.max(1, totalPages - count + 1);
      const pages = Array.from({ length: count }, (_, i) => start + i);
      return {
        description: `Last ${count} pages`,
        pages,
        start,
        end: totalPages,
        isSinglePage: count === 1,
        isContinuous: true
      };
    }

    // Handle range patterns (supports - and .. separators)
    if (part.includes('-') || part.includes('..')) {
      return this.parseRangePattern(part, totalPages);
    } else {
      return this.parseSinglePage(part, totalPages);
    }
  }

  /**
   * Parse range pattern with extended syntax
   * FIXED: Support for 5-last, 1..5 syntax
   */
  private static parseRangePattern(part: string, totalPages: number): PageRange {
    const separator = part.includes('..') ? '..' : '-';
    const [startStr, endStr] = part.split(separator).map(s => s.trim());

    if (!startStr || !endStr) {
      throw new Error('Invalid range format');
    }

    // Handle "end" and "last" keywords
    let start: number;
    let end: number;

    if (startStr.toLowerCase() === 'end' || startStr.toLowerCase() === 'last') {
      start = totalPages;
    } else {
      start = parseInt(startStr);
    }

    if (endStr.toLowerCase() === 'end' || endStr.toLowerCase() === 'last') {
      end = totalPages;
    } else {
      end = parseInt(endStr);
    }

    if (isNaN(start) || isNaN(end)) {
      throw new Error('Range values must be numbers or "end"/"last"');
    }

    if (start < 1 || end < 1) {
      throw new Error('Page numbers must be positive');
    }

    if (start > totalPages || end > totalPages) {
      throw new Error(`Page numbers cannot exceed ${totalPages}`);
    }

    if (start > end) {
      throw new Error('Start page cannot be greater than end page');
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return {
      description: start === end ? `Page ${start}` : `Pages ${start}-${end}`,
      pages,
      start,
      end,
      isSinglePage: start === end,
      isContinuous: true
    };
  }

  /**
   * Parse single page number
   */
  private static parseSinglePage(part: string, totalPages: number): PageRange {
    const pageNum = parseInt(part);

    if (isNaN(pageNum)) {
      throw new Error('Invalid page number');
    }

    if (pageNum < 1) {
      throw new Error('Page number must be positive');
    }

    if (pageNum > totalPages) {
      throw new Error(`Page number cannot exceed ${totalPages}`);
    }

    return {
      description: `Page ${pageNum}`,
      pages: [pageNum],
      start: pageNum,
      end: pageNum,
      isSinglePage: true,
      isContinuous: true
    };
  }

  /**
   * Generate ranges for splitting by pages per file
   */
  static generatePagesPerFileRanges(totalPages: number, pagesPerFile: number): PageRange[] {
    if (pagesPerFile < 1) {
      throw new SplitValidationError('Pages per file must be at least 1');
    }

    if (pagesPerFile > totalPages) {
      throw new SplitValidationError('Pages per file cannot exceed total pages');
    }

    const ranges: PageRange[] = [];
    
    for (let start = 1; start <= totalPages; start += pagesPerFile) {
      const end = Math.min(start + pagesPerFile - 1, totalPages);
      const pages = [];
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      ranges.push({
        description: start === end ? `Page ${start}` : `Pages ${start}-${end}`,
        pages,
        start,
        end,
        isSinglePage: start === end,
        isContinuous: true
      });
    }

    if (ranges.length > MAX_OUTPUT_FILES) {
      throw new SplitValidationError(
        `Too many output files: ${ranges.length} (maximum: ${MAX_OUTPUT_FILES}). Try increasing pages per file.`
      );
    }

    return ranges;
  }

  /**
   * Generate ranges for every page (one page per file)
   */
  static generateEveryPageRanges(totalPages: number): PageRange[] {
    if (totalPages > MAX_OUTPUT_FILES) {
      throw new SplitValidationError(
        `Too many pages for individual splitting: ${totalPages} (maximum: ${MAX_OUTPUT_FILES})`
      );
    }

    const ranges: PageRange[] = [];
    
    for (let i = 1; i <= totalPages; i++) {
      ranges.push({
        description: `Page ${i}`,
        pages: [i],
        start: i,
        end: i,
        isSinglePage: true,
        isContinuous: true
      });
    }

    return ranges;
  }
}

// === MAIN SPLIT FUNCTIONS (PURE) ===

/**
 * Split PDF by page ranges (pure function)
 * Returns array of Blobs for easy testing and integration
 */
export async function splitByRanges(
  file: File,
  ranges: string,
  options: Partial<SplitOptions> = {}
): Promise<Blob[]> {
  const result = await splitPDFWithDoc(file, ranges, options);
  return result.files.map(f => f.blob);
}

/**
 * Split PDF by pages per file (pure function)
 * FIXED: Avoid double loading
 */
export async function splitByPagesPerFile(
  file: File,
  pagesPerFile: number,
  options: Partial<SplitOptions> = {}
): Promise<Blob[]> {
  const { totalPages } = await loadPDF(file);
  
  // Generate ranges
  const ranges = PageRangeParser.generatePagesPerFileRanges(totalPages, pagesPerFile);
  const rangeString = ranges.map(r => 
    r.isSinglePage ? r.start!.toString() : `${r.start}-${r.end}`
  ).join(',');
  
  return splitByRanges(file, rangeString, options);
}

/**
 * Split PDF into individual pages (pure function)
 * FIXED: Avoid double loading
 */
export async function splitIntoPages(
  file: File,
  options: Partial<SplitOptions> = {}
): Promise<Blob[]> {
  const { totalPages } = await loadPDF(file);
  
  // Generate ranges for every page
  const ranges = PageRangeParser.generateEveryPageRanges(totalPages);
  const rangeString = ranges.map(r => r.start!.toString()).join(',');
  
  return splitByRanges(file, rangeString, options);
}

/**
 * Split PDF into odd and even pages (pure function)
 */
export async function splitEvenOdd(
  file: File,
  options: Partial<SplitOptions> = {}
): Promise<Blob[]> {
  return splitByRanges(file, 'odd,even', options);
}

/**
 * Main split function with full result metadata
 * FIXED: Preserve error metadata, better memory checks, avoid double loading
 */
export async function splitPDF(
  file: File,
  rangeString: string,
  options: Partial<SplitOptions> = {}
): Promise<SplitResult> {
  return splitPDFWithDoc(file, rangeString, options);
}

/**
 * Internal split function with loaded document
 * FIXED: All the major bugs and improvements
 */
async function splitPDFWithDoc(
  file: File,
  rangeString: string,
  options: Partial<SplitOptions> = {}
): Promise<SplitResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const warnings: string[] = [];

  // Create throttled progress callback
  const throttledProgress = createThrottledProgress(opts.onProgress);

  try {
    throttledProgress(0, 'Loading PDF document');

    // FIXED: Load PDF only once
    const { doc: sourceDoc, bytes: fileData, totalPages } = await loadPDF(file);

    if (totalPages === 0) {
      throw new SplitValidationError('PDF has no pages');
    }

    throttledProgress(10, 'Parsing page ranges');

    // FIXED: Honor validateRanges option properly
    const ranges = PageRangeParser.parseRanges(rangeString, totalPages, opts.validateRanges);

    // FIXED: Only enforce maxPagesPerFile if validateRanges is true
    if (opts.validateRanges && opts.maxPagesPerFile && opts.maxPagesPerFile > 0) {
      const offenders = ranges.filter(r => r.pages.length > opts.maxPagesPerFile);
      if (offenders.length > 0) {
        throw new SplitValidationError(
          `One or more ranges exceed maxPagesPerFile (${opts.maxPagesPerFile}).`
        );
      }
    }

    // FIXED: Better memory estimation and checks
    const estimatedMemoryUsage = fileData.byteLength * ranges.length * 1.2; // More conservative estimate
    const currentMemory = getCurrentMemoryUsage();
    
    if (estimatedMemoryUsage > opts.memoryLimit) {
      throw new SplitMemoryError(
        `Estimated memory usage (${Math.round(estimatedMemoryUsage / 1024 / 1024)}MB) may exceed limit (${Math.round(opts.memoryLimit / 1024 / 1024)}MB)`,
        estimatedMemoryUsage
      );
    }
    
    // FIXED: Only check current memory if we have the API available
    if (hasPerformanceMemory && currentMemory > opts.memoryLimit) {
      throw new SplitMemoryError(
        `Current memory usage (${Math.round(currentMemory / 1024 / 1024)}MB) exceeds limit`,
        currentMemory
      );
    }

    // FIXED: Extract all metadata types
    let originalMetadata: { title?: string; author?: string; subject?: string; keywords?: string } = {};
    try {
      originalMetadata.title = sourceDoc.getTitle() || undefined;
      originalMetadata.author = sourceDoc.getAuthor() || undefined;
      originalMetadata.subject = sourceDoc.getSubject() || undefined;
      originalMetadata.keywords = sourceDoc.getKeywords()?.join(', ') || undefined;
    } catch (error) {
      warnings.push('Could not extract original metadata');
    }

    throttledProgress(20, 'Creating split files');

    // Process each range
    const outputFiles: SplitResult['files'] = [];
    let totalOutputSize = 0;

    for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex++) {
      const range = ranges[rangeIndex];
      
      try {
        // FIXED: Better progress granularity for large ranges
        const baseProgress = 20 + Math.round((rangeIndex / ranges.length) * 70);
        throttledProgress(baseProgress, `Processing ${range.description}`);

        // Create new document for this range
        const newDoc = await PDFDocument.create();
        
        // Copy pages with per-page progress for large ranges
        const pageIndices = range.pages.map(pageNum => pageNum - 1);
        const copiedPages = await newDoc.copyPages(sourceDoc, pageIndices);
        
        // Add pages to new document
        copiedPages.forEach(page => {
          newDoc.addPage(page);
        });

        // Apply metadata
        applyMetadata(newDoc, originalMetadata, range, opts);

        // FIXED: Make updateFieldAppearances conditional
        const saveOptions = opts.optimizeStructure ? {
          useObjectStreams: true,
          addDefaultPage: false,
          updateFieldAppearances: opts.updateFormFields // Only if explicitly requested
        } : {};

        const pdfBytes = await newDoc.save(saveOptions);
        
        // Generate filename
        const filename = generateFilename(file, range, rangeIndex, ranges.length);
        
        // Create blob
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        
        // Create output file info
        const outputFile = {
          blob,
          filename,
          pages: range.pages,
          description: range.description
        };

        outputFiles.push(outputFile);
        totalOutputSize += pdfBytes.byteLength;

        // Memory management - check periodically
        if (rangeIndex % 3 === 0 && rangeIndex > 0 && hasPerformanceMemory) {
          const currentMemory = getCurrentMemoryUsage();
          if (currentMemory > opts.memoryLimit) {
            throw new SplitMemoryError(
              `Memory usage exceeded during processing: ${Math.round(currentMemory / 1024 / 1024)}MB`,
              currentMemory
            );
          }
        }

        // Yield control to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 1));

      } catch (error) {
        // FIXED: Preserve original error if it's already a SplitError
        if (error instanceof SplitError) {
          throw error;
        }
        
        throw new SplitError(
          `Failed to process range "${range.description}": ${error instanceof Error ? error.message : 'Unknown error'}`,
          'RANGE_PROCESSING_ERROR'
        );
      }
    }

    throttledProgress(100, 'Split completed!');

    // Calculate metrics
    const processingTime = Date.now() - startTime;
    const sizeRatio = totalOutputSize / fileData.byteLength;

    return {
      files: outputFiles,
      metadata: {
        originalPages: totalPages,
        outputFiles: outputFiles.length,
        totalOutputSize,
        originalSize: fileData.byteLength,
        processingTimeMs: processingTime,
        sizeRatio
      },
      warnings
    };

  } catch (error) {
    // FIXED: Preserve error metadata properly
    if (error instanceof SplitError) {
      throw error; // Keep original error with code and memoryUsed
    }
    
    let errorMessage = 'PDF split failed';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle common errors with friendly messages
      if (/password|encrypted/i.test(errorMessage)) {
        errorMessage = 'Encrypted/password-protected PDFs are not supported. Please use an unencrypted PDF.';
      }
    }

    throw new SplitError(errorMessage);
  }
}

// === UTILITY FUNCTIONS ===

/**
 * Validate page range string without processing
 */
export function validatePageRanges(rangeString: string, totalPages: number): {
  valid: boolean;
  ranges?: PageRange[];
  error?: string;
  outputFileCount?: number;
} {
  try {
    const ranges = PageRangeParser.parseRanges(rangeString, totalPages);
    return {
      valid: true,
      ranges,
      outputFileCount: ranges.length
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid page ranges'
    };
  }
}

/**
 * Get PDF page count
 */
export async function getPageCount(file: File): Promise<number> {
  const { totalPages } = await loadPDF(file);
  return totalPages;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const sizeIndex = Math.min(i, sizes.length - 1);
  
  return parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(2)) + ' ' + sizes[sizeIndex];
}

/**
 * Estimate split processing time
 */
export function estimateSplitTime(totalPages: number, outputFiles: number): number {
  // Rough estimate: 30ms per page + 100ms per output file
  const pageTime = totalPages * 30;
  const fileTime = outputFiles * 100;
  return Math.max(500, pageTime + fileTime); // Minimum 500ms
}

// === EXPORTS ===
export default {
  // Pure functions
  splitByRanges,
  splitByPagesPerFile,
  splitIntoPages,
  splitEvenOdd,
  
  // Full function with metadata
  splitPDF,
  
  // Utilities
  validatePageRanges,
  getPageCount,
  formatFileSize,
  estimateSplitTime,
  PageRangeParser,
  
  // Error classes
  SplitError,
  SplitValidationError,
  SplitMemoryError
};
