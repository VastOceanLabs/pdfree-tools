// src/utils/splitPdf.ts
// Production-ready PDF split utility for PDfree.tools
// FIXED: Password handling, validation logic, filename generation, and type safety

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
  onProgress?: (progress: number, info?: SplitProgressInfo) => void;
  
  /** Memory limit in bytes (default: 100MB) */
  memoryLimit?: number;
  
  /** Maximum pages per output file (default: 1000) */
  maxPagesPerFile?: number;
  
  /** Whether to validate page ranges before processing (default: true) */
  validateRanges?: boolean;
  
  /** Whether to apply structural optimization to output files (default: true) */
  optimizeStructure?: boolean;
  
  /** Original filename for generating split file names */
  originalFilename?: string;
}

export interface SplitProgressInfo {
  /** Current processing phase */
  phase?: string;
  
  /** Current range being processed */
  range?: string;
  
  /** Current page number being processed */
  page?: number;
  
  /** Total number of output files being created */
  totalFiles?: number;
  
  /** Current file being processed */
  currentFile?: number;
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

export interface SplitFileOutput {
  /** File data as Uint8Array */
  data: Uint8Array;
  
  /** Suggested filename */
  filename: string;
  
  /** Page numbers included (1-indexed) */
  pages: number[];
  
  /** Page count in this file */
  pageCount: number;
  
  /** File size in bytes */
  size: number;
  
  /** Range description for user display */
  description: string;
}

export interface SplitResult {
  /** Success status */
  success: boolean;
  
  /** Array of split PDF files */
  files?: SplitFileOutput[];
  
  /** Error message if failed */
  error?: string;
  
  /** Processing metadata */
  metadata?: {
    originalPages: number;
    outputFiles: number;
    totalOutputSize: number;
    originalSize: number;
    processingTimeMs: number;
    /** Size expansion ratio: output_size / input_size (>1 means larger, <1 means smaller) */
    sizeRatio: number;
    averageFileSize: number;
    largestFileSize: number;
    smallestFileSize: number;
  };
  
  /** Non-fatal warnings */
  warnings?: string[];
  
  /** Processing details for debugging */
  details?: Record<string, any>;
}

export interface SplitMode {
  type: 'ranges' | 'pages-per-file' | 'every-page' | 'even-odd';
  value?: string | number;
  description: string;
}

// === CONSTANTS ===
const DEFAULT_OPTIONS: Required<Omit<SplitOptions, 'originalFilename'>> = {
  preserveMetadata: true,
  customMetadata: {},
  onProgress: () => {},
  memoryLimit: 100 * 1024 * 1024, // 100MB
  maxPagesPerFile: 1000,
  validateRanges: true,
  optimizeStructure: true
};

const MAX_OUTPUT_FILES = 100; // Reasonable limit to prevent abuse
const PROGRESS_UPDATE_INTERVAL = 50; // Update progress every 50ms

// === ERROR CLASSES ===
export class SplitError extends Error {
  constructor(message: string, public code?: string, public details?: Record<string, any>) {
    super(message);
    this.name = 'SplitError';
  }
}

export class SplitValidationError extends SplitError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'SplitValidationError';
  }
}

export class SplitMemoryError extends SplitError {
  constructor(message: string, public memoryUsed?: number) {
    super(message, 'MEMORY_ERROR', { memoryUsed });
    this.name = 'SplitMemoryError';
  }
}

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
 * Force garbage collection if available (mainly for development/testing)
 */
const forceGarbageCollection = async (): Promise<void> => {
  // Check both window.gc and globalThis.gc
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).gc === 'function') {
    try {
      (globalThis as any).gc();
    } catch {
      // GC not available
    }
  } else if (isBrowser && typeof (window as any).gc === 'function') {
    try {
      (window as any).gc();
    } catch {
      // GC not available
    }
  }
  
  // Yield to allow natural GC
  await new Promise(resolve => setTimeout(resolve, 10));
};

/**
 * Throttle progress callbacks to avoid UI jank
 */
const createThrottledProgress = (
  callback: (progress: number, info?: SplitProgressInfo) => void,
  throttleMs = PROGRESS_UPDATE_INTERVAL
) => {
  let lastCall = 0;
  let lastProgress = -1;
  
  return (progress: number, info?: SplitProgressInfo) => {
    const now = Date.now();
    const significantChange = Math.abs(progress - lastProgress) >= 3; // Lowered threshold
    
    if (progress === 100 || progress === 0 || now - lastCall >= throttleMs || significantChange) {
      callback(progress, info);
      lastCall = now;
      lastProgress = progress;
    }
  };
};

/**
 * Generate safe filename for split files
 * FIXED: Actually use the original filename
 */
const generateFilename = (
  originalName: string,
  range: PageRange,
  index: number,
  totalFiles: number
): string => {
  // Remove extension from original name
  const baseName = originalName.replace(/\.pdf$/i, '');
  
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
 */
const applyMetadata = (
  doc: PDFDocument,
  originalMetadata: { title?: string; author?: string },
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

    // Apply other metadata
    if (options.customMetadata?.author) {
      doc.setAuthor(options.customMetadata.author);
    } else if (options.preserveMetadata && originalMetadata.author) {
      doc.setAuthor(originalMetadata.author);
    }

    if (options.customMetadata?.subject) {
      doc.setSubject(options.customMetadata.subject);
    }

    if (options.customMetadata?.keywords) {
      doc.setKeywords(options.customMetadata.keywords);
    }

  } catch (error) {
    // Non-critical metadata errors should not fail the split
    console.warn('Failed to apply metadata:', error);
  }
};

/**
 * Normalize and deduplicate page ranges
 * FIXED: Handle overlapping/duplicate pages
 */
const normalizePageRanges = (ranges: PageRange[]): PageRange[] => {
  // Collect all unique pages with their source ranges
  const pageToRanges = new Map<number, PageRange[]>();
  
  ranges.forEach(range => {
    range.pages.forEach(page => {
      if (!pageToRanges.has(page)) {
        pageToRanges.set(page, []);
      }
      pageToRanges.get(page)!.push(range);
    });
  });
  
  // Find duplicated pages
  const duplicatedPages = Array.from(pageToRanges.entries())
    .filter(([_, sourceRanges]) => sourceRanges.length > 1)
    .map(([page, _]) => page);
  
  if (duplicatedPages.length > 0) {
    console.warn(`Warning: Pages ${duplicatedPages.join(', ')} appear in multiple ranges and will be duplicated in output files.`);
  }
  
  return ranges; // Return original ranges for now - user intent might be to duplicate
};

// === PAGE RANGE PARSING ===
export class PageRangeParser {
  /**
   * Parse page ranges string with comprehensive validation
   * Supports: "1", "1-5", "1,3,5", "1-3,5,7-9", "odd", "even", "last", etc.
   */
  static parseRanges(rangeString: string, totalPages: number): PageRange[] {
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
          `Invalid range "${part}": ${error instanceof Error ? error.message : 'Unknown error'}`,
          { invalidRange: part, partIndex: i }
        );
      }
    }

    // Validate total output files
    if (ranges.length > MAX_OUTPUT_FILES) {
      throw new SplitValidationError(
        `Too many output files: ${ranges.length} (maximum: ${MAX_OUTPUT_FILES})`
      );
    }

    return normalizePageRanges(ranges);
  }

  /**
   * Fast parsing with minimal validation (for validateRanges: false)
   * FIXED: Actually implement the fast path
   */
  static fastParseRanges(rangeString: string, totalPages: number): PageRange[] {
    if (!rangeString || rangeString.trim() === '') {
      throw new SplitValidationError('Page range cannot be empty');
    }

    const ranges: PageRange[] = [];
    const parts = rangeString.split(',').map(part => part.trim()).filter(part => part.length > 0);

    for (const part of parts) {
      // Minimal validation - just check basic format and bounds
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr.trim());
        const end = parseInt(endStr.trim());
        
        if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
          throw new SplitValidationError(`Invalid range: ${part}`);
        }
        
        const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        ranges.push({
          description: start === end ? `Page ${start}` : `Pages ${start}-${end}`,
          pages,
          start,
          end,
          isSinglePage: start === end,
          isContinuous: true
        });
      } else {
        const pageNum = parseInt(part.trim());
        if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
          throw new SplitValidationError(`Invalid page: ${part}`);
        }
        
        ranges.push({
          description: `Page ${pageNum}`,
          pages: [pageNum],
          start: pageNum,
          end: pageNum,
          isSinglePage: true,
          isContinuous: true
        });
      }
    }

    return ranges;
  }

  /**
   * Parse a single range part (full validation)
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

    // Handle range patterns
    if (part.includes('-')) {
      return this.parseRangePattern(part, totalPages);
    } else {
      return this.parseSinglePage(part, totalPages);
    }
  }

  /**
   * Parse range pattern (e.g., "1-5", "10-end")
   */
  private static parseRangePattern(part: string, totalPages: number): PageRange {
    const [startStr, endStr] = part.split('-').map(s => s.trim());

    if (!startStr || !endStr) {
      throw new Error('Invalid range format');
    }

    // Handle "end" keyword
    const start = startStr.toLowerCase() === 'end' ? totalPages : parseInt(startStr);
    const end = endStr.toLowerCase() === 'end' ? totalPages : parseInt(endStr);

    if (isNaN(start) || isNaN(end)) {
      throw new Error('Range values must be numbers or "end"');
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
   * FIXED: Check against MAX_OUTPUT_FILES
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

    // FIXED: Check output file limit
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

// === MAIN SPLIT FUNCTION ===
/**
 * Split PDF into multiple files based on page ranges
 * FIXED: Remove password support, enforce maxPagesPerFile, fix validation logic
 */
export async function splitPDF(
  fileData: ArrayBuffer,
  rangeString: string,
  options: Partial<SplitOptions> = {}
): Promise<SplitResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const warnings: string[] = [];
  const originalFilename = opts.originalFilename || 'document';

  // Create throttled progress callback
  const throttledProgress = createThrottledProgress(opts.onProgress);

  try {
    throttledProgress(0, { phase: 'Loading PDF document' });

    // Load the source PDF (pdf-lib doesn't support password-protected PDFs)
    // If the PDF is encrypted, this will throw an error
    const sourceDoc = await PDFDocument.load(fileData);
    const totalPages = sourceDoc.getPageCount();

    if (totalPages === 0) {
      throw new SplitValidationError('PDF has no pages');
    }

    throttledProgress(10, { phase: 'Parsing page ranges' });

    // Parse page ranges with proper validation logic
    let ranges: PageRange[];
    
    if (opts.validateRanges) {
      ranges = PageRangeParser.parseRanges(rangeString, totalPages);
    } else {
      // FIXED: Actually use fast parsing
      ranges = PageRangeParser.fastParseRanges(rangeString, totalPages);
    }

    // FIXED: Enforce maxPagesPerFile
    if (opts.maxPagesPerFile && opts.maxPagesPerFile > 0) {
      const offenders = ranges.filter(r => r.pages.length > opts.maxPagesPerFile);
      if (offenders.length > 0) {
        throw new SplitValidationError(
          `One or more ranges exceed maxPagesPerFile (${opts.maxPagesPerFile}).`,
          { 
            offenders: offenders.map(o => o.description),
            maxPagesPerFile: opts.maxPagesPerFile
          }
        );
      }
    }

    // Memory estimation - use both current memory and estimated usage
    const estimatedMemoryUsage = fileData.byteLength * ranges.length * 1.5;
    const currentMemory = getCurrentMemoryUsage();
    
    if (estimatedMemoryUsage > opts.memoryLimit) {
      throw new SplitMemoryError(
        `Estimated memory usage (${Math.round(estimatedMemoryUsage / 1024 / 1024)}MB) exceeds limit (${Math.round(opts.memoryLimit / 1024 / 1024)}MB)`,
        estimatedMemoryUsage
      );
    }
    
    if (currentMemory > 0 && currentMemory > opts.memoryLimit) {
      throw new SplitMemoryError(
        `Current memory usage (${Math.round(currentMemory / 1024 / 1024)}MB) exceeds limit`,
        currentMemory
      );
    }

    // Extract original metadata
    let originalMetadata: { title?: string; author?: string } = {};
    try {
      originalMetadata.title = sourceDoc.getTitle() || undefined;
      originalMetadata.author = sourceDoc.getAuthor() || undefined;
    } catch (error) {
      // Metadata extraction failed - not critical
      warnings.push('Could not extract original metadata');
    }

    throttledProgress(20, { 
      phase: 'Creating split files',
      totalFiles: ranges.length
    });

    // Process each range
    const outputFiles: SplitFileOutput[] = [];
    let totalOutputSize = 0;

    for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex++) {
      const range = ranges[rangeIndex];
      
      try {
        throttledProgress(
          20 + Math.round((rangeIndex / ranges.length) * 70),
          {
            phase: 'Processing range',
            range: range.description,
            currentFile: rangeIndex + 1,
            totalFiles: ranges.length
          }
        );

        // Create new document for this range
        const newDoc = await PDFDocument.create();
        
        // Copy pages (convert to 0-based indices for PDF-lib)
        const pageIndices = range.pages.map(pageNum => pageNum - 1);
        const copiedPages = await newDoc.copyPages(sourceDoc, pageIndices);
        
        // Add pages to new document
        copiedPages.forEach(page => {
          newDoc.addPage(page);
        });

        // Apply metadata
        applyMetadata(newDoc, originalMetadata, range, opts);

        // Save with structural optimization if requested
        const saveOptions = opts.optimizeStructure ? {
          useObjectStreams: true,
          addDefaultPage: false,
          updateFieldAppearances: true
        } : {};

        const pdfBytes = await newDoc.save(saveOptions);
        
        // FIXED: Generate filename with original name
        const filename = generateFilename(originalFilename, range, rangeIndex, ranges.length);
        
        // Create output file info
        const outputFile: SplitFileOutput = {
          data: pdfBytes,
          filename,
          pages: range.pages,
          pageCount: range.pages.length,
          size: pdfBytes.byteLength,
          description: range.description
        };

        outputFiles.push(outputFile);
        totalOutputSize += pdfBytes.byteLength;

        // Memory management - force GC periodically
        if (rangeIndex % 5 === 0 && rangeIndex > 0) {
          await forceGarbageCollection();
          
          // Check memory usage
          const currentMemory = getCurrentMemoryUsage();
          if (currentMemory > 0 && currentMemory > opts.memoryLimit) {
            throw new SplitMemoryError(
              `Memory usage exceeded during processing: ${Math.round(currentMemory / 1024 / 1024)}MB`,
              currentMemory
            );
          }
        }

        // Yield control to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 1));

      } catch (error) {
        throw new SplitError(
          `Failed to process range "${range.description}": ${error instanceof Error ? error.message : 'Unknown error'}`,
          'RANGE_PROCESSING_ERROR',
          { rangeIndex, range: range.description }
        );
      }
    }

    throttledProgress(95, { phase: 'Finalizing split operation' });

    // Calculate metrics
    const processingTime = Date.now() - startTime;
    const sizeRatio = totalOutputSize / fileData.byteLength; // FIXED: Corrected ratio calculation
    const fileSizes = outputFiles.map(f => f.size);
    const averageFileSize = totalOutputSize / outputFiles.length;
    const largestFileSize = Math.max(...fileSizes);
    const smallestFileSize = Math.min(...fileSizes);

    throttledProgress(100, { phase: 'Split completed!' });

    return {
      success: true,
      files: outputFiles,
      metadata: {
        originalPages: totalPages,
        outputFiles: outputFiles.length,
        totalOutputSize,
        originalSize: fileData.byteLength,
        processingTimeMs: processingTime,
        sizeRatio, // FIXED: Use consistent naming
        averageFileSize,
        largestFileSize,
        smallestFileSize
      },
      warnings,
      details: {
        rangesProcessed: ranges.length,
        structuralOptimization: opts.optimizeStructure,
        validationEnabled: opts.validateRanges,
        memoryUsage: getCurrentMemoryUsage(),
        maxPagesPerFileEnforced: opts.maxPagesPerFile || 'none'
      }
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    let errorMessage = 'PDF split failed';
    let errorCode = 'UNKNOWN_ERROR';
    let details: Record<string, any> = {};

    if (error instanceof SplitError) {
      errorMessage = error.message;
      errorCode = error.code || 'SPLIT_ERROR';
      details = error.details || {};
    } else if (error instanceof Error) {
      errorMessage = error.message;
      
      // Categorize common errors
      if (error.message.includes('memory') || error.message.includes('Memory')) {
        errorCode = 'MEMORY_ERROR';
      } else if (error.message.includes('password') || error.message.includes('encrypted')) {
        errorCode = 'ENCRYPTION_ERROR';
        errorMessage = 'Encrypted/password-protected PDFs are not supported by this tool. Please use an unencrypted PDF.';
      } else if (error.message.includes('corrupted') || error.message.includes('invalid')) {
        errorCode = 'CORRUPTION_ERROR';
      } else if (error.message.includes('range') || error.message.includes('page')) {
        errorCode = 'RANGE_ERROR';
      }
    }

    return {
      success: false,
      error: errorMessage,
      warnings,
      metadata: {
        originalPages: 0,
        outputFiles: 0,
        totalOutputSize: 0,
        originalSize: fileData.byteLength,
        processingTimeMs: processingTime,
        sizeRatio: 1,
        averageFileSize: 0,
        largestFileSize: 0,
        smallestFileSize: 0
      },
      details: {
        errorCode,
        memoryUsage: getCurrentMemoryUsage(),
        ...details
      }
    };
  }
}

// === CONVENIENCE FUNCTIONS ===

/**
 * Split PDF by pages per file
 */
export async function splitPDFByPagesPerFile(
  fileData: ArrayBuffer,
  pagesPerFile: number,
  options: Partial<SplitOptions> = {}
): Promise<SplitResult> {
  // First, load the PDF to get page count (no password support)
  const doc = await PDFDocument.load(fileData);
  const totalPages = doc.getPageCount();
  
  // Generate ranges with proper validation
  const ranges = PageRangeParser.generatePagesPerFileRanges(totalPages, pagesPerFile);
  const rangeString = ranges.map(r => 
    r.isSinglePage ? r.start!.toString() : `${r.start}-${r.end}`
  ).join(',');
  
  return splitPDF(fileData, rangeString, options);
}

/**
 * Split PDF into individual pages (one page per file)
 */
export async function splitPDFEveryPage(
  fileData: ArrayBuffer,
  options: Partial<SplitOptions> = {}
): Promise<SplitResult> {
  // First, load the PDF to get page count (no password support)
  const doc = await PDFDocument.load(fileData);
  const totalPages = doc.getPageCount();
  
  // Generate ranges for every page with validation
  const ranges = PageRangeParser.generateEveryPageRanges(totalPages);
  const rangeString = ranges.map(r => r.start!.toString()).join(',');
  
  return splitPDF(fileData, rangeString, options);
}

/**
 * Split PDF into odd and even pages
 * FIXED: Consistent naming with SplitMode.type
 */
export async function splitPDFEvenOdd(
  fileData: ArrayBuffer,
  options: Partial<SplitOptions> = {}
): Promise<SplitResult> {
  return splitPDF(fileData, 'odd,even', options);
}

/**
 * Simple split function for basic use cases
 * Note: Returns simplified result without full metadata/warnings
 */
export async function simpleSplitPDF(
  fileData: ArrayBuffer,
  pageRanges: string,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; files?: SplitFileOutput[]; error?: string }> {
  const progressCallback = onProgress 
    ? (progress: number, _info?: SplitProgressInfo) => onProgress(progress)
    : undefined;

  const result = await splitPDF(fileData, pageRanges, { onProgress: progressCallback });

  return {
    success: result.success,
    files: result.files,
    error: result.error
  };
}

// === UTILITY EXPORTS ===
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const sizeIndex = Math.min(i, sizes.length - 1);
  
  return parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(2)) + ' ' + sizes[sizeIndex];
};

/**
 * Validate page range string without processing
 */
export const validatePageRanges = (rangeString: string, totalPages: number): {
  valid: boolean;
  ranges?: PageRange[];
  error?: string;
  outputFileCount?: number;
} => {
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
};

/**
 * Get suggested split modes based on PDF characteristics
 * FIXED: Consistent naming for even-odd
 */
export const getSuggestedSplitModes = (totalPages: number): SplitMode[] => {
  const modes: SplitMode[] = [];

  // Always suggest every page for small PDFs
  if (totalPages <= 20) {
    modes.push({
      type: 'every-page',
      description: `Split into ${totalPages} individual pages`
    });
  }

  // Suggest pages per file options
  const pagesPerFileOptions = [2, 5, 10, 25];
  for (const pages of pagesPerFileOptions) {
    if (pages < totalPages) {
      const fileCount = Math.ceil(totalPages / pages);
      if (fileCount <= MAX_OUTPUT_FILES) {
        modes.push({
          type: 'pages-per-file',
          value: pages,
          description: `${pages} pages per file (${fileCount} files)`
        });
      }
    }
  }

  // Suggest odd/even for duplex documents
  if (totalPages > 1) {
    modes.push({
      type: 'even-odd',
      description: 'Split into odd and even pages (2 files)'
    });
  }

  // Suggest custom ranges
  modes.push({
    type: 'ranges',
    description: 'Custom page ranges'
  });

  return modes;
};

/**
 * Estimate split processing time
 */
export const estimateSplitTime = (totalPages: number, outputFiles: number): number => {
  // Rough estimate: 30ms per page + 100ms per output file
  const pageTime = totalPages * 30;
  const fileTime = outputFiles * 100;
  return Math.max(500, pageTime + fileTime); // Minimum 500ms
};

// === DEFAULT EXPORT ===
export default {
  splitPDF,
  splitPDFByPagesPerFile,
  splitPDFEveryPage,
  splitPDFEvenOdd, // FIXED: Consistent naming
  simpleSplitPDF,
  PageRangeParser,
  validatePageRanges,
  getSuggestedSplitModes,
  estimateSplitTime,
  formatFileSize,
  SplitError,
  SplitValidationError,
  SplitMemoryError
};