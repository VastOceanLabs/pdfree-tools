// src/utils/mergePdf.ts
// Production-ready PDF merge utility for PDfree.tools
// Memory-efficient processing with metadata preservation and comprehensive error handling

import { PDFDocument } from 'pdf-lib';

// === TYPES ===
export interface MergeOptions {
  /** Whether to preserve original metadata from first PDF */
  preserveMetadata?: boolean;
  
  /** Custom metadata to apply to merged PDF */
  customMetadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    creator?: string;
    producer?: string;
  };
  
  /** Progress callback for UI updates */
  onProgress?: (progress: number, info?: ProgressInfo) => void;
  
  /** Memory limit in bytes (default: 100MB) */
  memoryLimit?: number;
  
  /** Maximum total pages across all PDFs */
  maxTotalPages?: number;
  
  /** Whether to validate each PDF before processing (default: true) */
  validateInputs?: boolean;
  
  /** Whether to optimize the final merged PDF (applies basic compression) */
  optimize?: boolean;
}

export interface ProgressInfo {
  /** Current processing phase */
  phase?: string;
  
  /** Current file being processed */
  file?: string;
  
  /** Current page number being processed */
  page?: number;
}

export interface MergeFileInput {
  /** File data as ArrayBuffer */
  data: ArrayBuffer;
  
  /** Optional filename for progress reporting */
  filename?: string;
  
  /** Password if PDF is encrypted */
  password?: string;
  
  /** Specific page ranges to include (e.g., "1-3,5,7-9") */
  pageRanges?: string;
  
  /** Whether to reverse page order for this file */
  reversePages?: boolean;
}

export interface MergeResult {
  /** Success status */
  success: boolean;
  
  /** Merged PDF data */
  data?: Uint8Array;
  
  /** Error message if failed */
  error?: string;
  
  /** Processing metadata */
  metadata?: {
    totalPages: number;
    totalFiles: number;
    originalTotalSize: number;
    mergedSize: number;
    processingTimeMs: number;
    compressionRatio: number;
    filesProcessed: string[];
    warningsCount: number;
    perFileDetails: Array<{
      filename: string;
      pageCount: number;
      selectedPages: number;
      processingTimeMs: number;
    }>;
  };
  
  /** Non-fatal warnings */
  warnings?: string[];
  
  /** Processing details for debugging */
  details?: Record<string, any>;
}

// === CONSTANTS ===
const DEFAULT_OPTIONS: Required<MergeOptions> = {
  preserveMetadata: true,
  customMetadata: {},
  onProgress: () => {},
  memoryLimit: 100 * 1024 * 1024, // 100MB
  maxTotalPages: 10000, // Reasonable limit
  validateInputs: true,
  optimize: true
};

const MERGE_CHUNK_SIZE = 10; // Process pages in chunks to avoid memory spikes
const MEMORY_CHECK_INTERVAL = 5; // Check memory every N pages

// === ERROR CLASSES ===
export class MergeError extends Error {
  constructor(message: string, public code?: string, public details?: Record<string, any>) {
    super(message);
    this.name = 'MergeError';
  }
}

export class MergeValidationError extends MergeError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'MergeValidationError';
  }
}

export class MergeMemoryError extends MergeError {
  constructor(message: string, public memoryUsed?: number) {
    super(message, 'MEMORY_ERROR', { memoryUsed });
    this.name = 'MergeMemoryError';
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
  return 0; // Unknown memory usage - memory checks will be bypassed
};

/**
 * Parse page ranges string (e.g., "1-3,5,7-9")
 * Fixed: Handle empty parts and malformed input gracefully
 */
const parsePageRanges = (ranges: string, totalPages: number): number[] => {
  if (!ranges || ranges.trim() === '') {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const result: number[] = [];
  const parts = ranges.split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0); // Filter out empty parts

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n.trim()));
      if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
        throw new MergeValidationError(`Invalid page range: ${part}. Must be between 1 and ${totalPages}`);
      }
      
      for (let i = start; i <= end; i++) {
        if (!result.includes(i)) {
          result.push(i);
        }
      }
    } else {
      const pageNum = parseInt(part.trim());
      if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
        throw new MergeValidationError(`Invalid page number: ${part}. Must be between 1 and ${totalPages}`);
      }
      
      if (!result.includes(pageNum)) {
        result.push(pageNum);
      }
    }
  }

  return result.sort((a, b) => a - b);
};

/**
 * Validate PDF data and extract basic info
 * Fixed: Handle password parameter and encryption detection
 */
const validatePDFData = async (
  data: ArrayBuffer, 
  filename?: string, 
  password?: string
): Promise<{
  doc: PDFDocument;
  pageCount: number;
  isEncrypted: boolean;
  title?: string;
  author?: string;
}> => {
  try {
    // Check basic PDF signature
    const bytes = new Uint8Array(data.slice(0, 8));
    const pdfSignature = [0x25, 0x50, 0x44, 0x46]; // %PDF
    const hasValidSignature = pdfSignature.every((byte, i) => bytes[i] === byte);
    
    if (!hasValidSignature) {
      throw new MergeValidationError(`Invalid PDF signature in file ${filename || 'unknown'}`);
    }

    // Try to load document with password if provided
    const loadOptions = password ? { password } : undefined;
    const doc = await PDFDocument.load(data, loadOptions);
    const pageCount = doc.getPageCount();

    if (pageCount === 0) {
      throw new MergeValidationError(`PDF file ${filename || 'unknown'} has no pages`);
    }

    // Extract metadata safely
    let title: string | undefined;
    let author: string | undefined;
    let isEncrypted = false;

    try {
      title = doc.getTitle() || undefined;
      author = doc.getAuthor() || undefined;
    } catch (error) {
      // Metadata extraction failed - not critical
      if (error instanceof Error && error.message.includes('encrypted')) {
        isEncrypted = true;
      }
    }

    // If we got here with a password, the file was encrypted
    if (password) {
      isEncrypted = true;
    }

    return { doc, pageCount, isEncrypted, title, author };
  } catch (error) {
    if (error instanceof MergeValidationError) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.message.includes('password') || error.message.includes('encrypted')) {
        throw new MergeValidationError(
          `PDF file ${filename || 'unknown'} is password protected`,
          { requiresPassword: true }
        );
      } else if (error.message.includes('corrupted') || error.message.includes('invalid')) {
        throw new MergeValidationError(`PDF file ${filename || 'unknown'} appears to be corrupted`);
      }
    }
    
    throw new MergeValidationError(
      `Failed to validate PDF file ${filename || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Force garbage collection if available
 */
const forceGarbageCollection = async (): Promise<void> => {
  if (isBrowser && typeof (window as any).gc === 'function') {
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
 * Apply metadata to merged PDF
 * Fixed: Safe metadata handling with proper error catching
 */
const applyMetadata = (
  mergedDoc: PDFDocument, 
  sourceMetadata: Array<{ title?: string; author?: string }>,
  options: MergeOptions
): void => {
  let titleSet = false;
  let authorSet = false;

  try {
    // Set default metadata
    mergedDoc.setCreator('PDfree.tools');
    mergedDoc.setProducer('PDfree.tools - Free PDF Tools');
    mergedDoc.setCreationDate(new Date());
    mergedDoc.setModificationDate(new Date());

    // Apply custom metadata first
    if (options.customMetadata) {
      const custom = options.customMetadata;
      if (custom.title) {
        mergedDoc.setTitle(custom.title);
        titleSet = true;
      }
      if (custom.author) {
        mergedDoc.setAuthor(custom.author);
        authorSet = true;
      }
      if (custom.subject) mergedDoc.setSubject(custom.subject);
      if (custom.keywords) mergedDoc.setKeywords(custom.keywords);
      if (custom.creator) mergedDoc.setCreator(custom.creator);
      if (custom.producer) mergedDoc.setProducer(custom.producer);
    }

    // Preserve metadata from first source if requested and no custom override
    if (options.preserveMetadata && sourceMetadata.length > 0) {
      const firstSource = sourceMetadata[0];
      
      if (!titleSet && firstSource.title) {
        mergedDoc.setTitle(`${firstSource.title} (Merged)`);
        titleSet = true;
      }
      
      if (!authorSet && firstSource.author) {
        mergedDoc.setAuthor(firstSource.author);
        authorSet = true;
      }
    }

    // Set fallback title if none provided
    if (!titleSet) {
      mergedDoc.setTitle('Merged PDF');
    }
  } catch (error) {
    // Non-critical metadata errors should not fail the merge
    console.warn('Failed to apply metadata:', error);
  }
};

/**
 * Throttle progress callbacks to avoid UI jank
 */
const createThrottledProgress = (
  callback: (progress: number, info?: ProgressInfo) => void,
  throttleMs = 100
) => {
  let lastCall = 0;
  let lastProgress = -1;
  
  return (progress: number, info?: ProgressInfo) => {
    const now = Date.now();
    if (progress === 100 || progress === 0 || now - lastCall >= throttleMs || Math.abs(progress - lastProgress) >= 5) {
      callback(progress, info);
      lastCall = now;
      lastProgress = progress;
    }
  };
};

// === MAIN MERGE FUNCTION ===
/**
 * Merge multiple PDF files into a single document
 * Fixed: Password handling, progress info structure, validation options
 */
export async function mergePDFs(
  files: MergeFileInput[],
  options: Partial<MergeOptions> = {}
): Promise<MergeResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const warnings: string[] = [];
  const filesProcessed: string[] = [];
  const perFileDetails: Array<{
    filename: string;
    pageCount: number;
    selectedPages: number;
    processingTimeMs: number;
  }> = [];
  let totalOriginalSize = 0;
  let totalPages = 0;

  // Create throttled progress callback
  const throttledProgress = createThrottledProgress(opts.onProgress);

  // Validation
  if (!files || files.length === 0) {
    return {
      success: false,
      error: 'No files provided for merging',
      warnings: []
    };
  }

  if (files.length === 1) {
    warnings.push('Only one file provided - no merging necessary');
  }

  try {
    throttledProgress(0, { phase: 'Starting merge process' });

    // Phase 1: Validate all files and collect metadata (if validation enabled)
    const validatedFiles: Array<{
      doc: PDFDocument;
      pageCount: number;
      selectedPages: number[];
      metadata: { title?: string; author?: string };
      filename: string;
    }> = [];

    if (opts.validateInputs) {
      throttledProgress(5, { phase: 'Validating files' });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileStartTime = Date.now();
        const filename = file.filename || `File ${i + 1}`;
        
        totalOriginalSize += file.data.byteLength;
        
        try {
          // Validate PDF with password support
          const validation = await validatePDFData(file.data, filename, file.password);
          
          // Parse page selections
          const selectedPages = file.pageRanges 
            ? parsePageRanges(file.pageRanges, validation.pageCount)
            : Array.from({ length: validation.pageCount }, (_, idx) => idx + 1);

          // Apply reverse pages if requested
          if (file.reversePages) {
            selectedPages.reverse();
          }

          totalPages += selectedPages.length;
          
          // Check total page limit
          if (totalPages > opts.maxTotalPages) {
            throw new MergeValidationError(
              `Total page count exceeds limit: ${totalPages} > ${opts.maxTotalPages}`
            );
          }

          validatedFiles.push({
            doc: validation.doc,
            pageCount: validation.pageCount,
            selectedPages,
            metadata: {
              title: validation.title,
              author: validation.author
            },
            filename
          });

          perFileDetails.push({
            filename,
            pageCount: validation.pageCount,
            selectedPages: selectedPages.length,
            processingTimeMs: Date.now() - fileStartTime
          });

          filesProcessed.push(filename);
          
          if (validation.isEncrypted) {
            warnings.push(`File ${filename} was encrypted but loaded successfully`);
          }

        } catch (error) {
          throw new MergeError(
            `Failed to process file ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'FILE_PROCESSING_ERROR',
            { fileIndex: i, filename }
          );
        }

        throttledProgress(
          5 + Math.round(((i + 1) / files.length) * 15), // 5-20% for validation
          { phase: 'Validating files', file: filename }
        );
      }
    } else {
      // Fast path: skip validation, just load documents
      throttledProgress(5, { phase: 'Loading files (validation skipped)' });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileStartTime = Date.now();
        const filename = file.filename || `File ${i + 1}`;
        
        totalOriginalSize += file.data.byteLength;

        try {
          const loadOptions = file.password ? { password: file.password } : undefined;
          const doc = await PDFDocument.load(file.data, loadOptions);
          const pageCount = doc.getPageCount();

          const selectedPages = file.pageRanges 
            ? parsePageRanges(file.pageRanges, pageCount)
            : Array.from({ length: pageCount }, (_, idx) => idx + 1);

          if (file.reversePages) {
            selectedPages.reverse();
          }

          totalPages += selectedPages.length;

          validatedFiles.push({
            doc,
            pageCount,
            selectedPages,
            metadata: { title: undefined, author: undefined },
            filename
          });

          perFileDetails.push({
            filename,
            pageCount,
            selectedPages: selectedPages.length,
            processingTimeMs: Date.now() - fileStartTime
          });

          filesProcessed.push(filename);

        } catch (error) {
          throw new MergeError(
            `Failed to load file ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'FILE_LOADING_ERROR',
            { fileIndex: i, filename }
          );
        }

        throttledProgress(
          5 + Math.round(((i + 1) / files.length) * 15),
          { phase: 'Loading files', file: filename }
        );
      }
    }

    // Check memory constraints (best effort)
    const estimatedMemoryUsage = totalOriginalSize * 3; // Conservative estimate
    const currentMemory = getCurrentMemoryUsage();
    if (currentMemory > 0 && estimatedMemoryUsage > opts.memoryLimit) {
      throw new MergeMemoryError(
        `Estimated memory usage (${Math.round(estimatedMemoryUsage / 1024 / 1024)}MB) exceeds limit (${Math.round(opts.memoryLimit / 1024 / 1024)}MB)`,
        estimatedMemoryUsage
      );
    }

    throttledProgress(25, { phase: 'Creating merged document' });

    // Phase 2: Create merged document
    const mergedDoc = await PDFDocument.create();
    let processedPageCount = 0;

    // Apply metadata
    const sourceMetadata = validatedFiles.map(f => f.metadata);
    applyMetadata(mergedDoc, sourceMetadata, opts);

    throttledProgress(30, { phase: 'Copying pages' });

    // Phase 3: Copy pages in chunks to manage memory
    for (let fileIndex = 0; fileIndex < validatedFiles.length; fileIndex++) {
      const validatedFile = validatedFiles[fileIndex];
      const { doc: sourceDoc, selectedPages, filename } = validatedFile;

      // Convert to 0-based page indices for PDF-lib
      const pageIndices = selectedPages.map(pageNum => pageNum - 1);

      // Process pages in chunks to avoid memory spikes
      for (let chunkStart = 0; chunkStart < pageIndices.length; chunkStart += MERGE_CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + MERGE_CHUNK_SIZE, pageIndices.length);
        const chunkIndices = pageIndices.slice(chunkStart, chunkEnd);

        try {
          // Copy chunk of pages
          const copiedPages = await mergedDoc.copyPages(sourceDoc, chunkIndices);
          
          // Add pages to merged document
          copiedPages.forEach(page => {
            mergedDoc.addPage(page);
          });

          processedPageCount += copiedPages.length;

          // Memory check (best effort)
          if (processedPageCount % MEMORY_CHECK_INTERVAL === 0) {
            const currentMemory = getCurrentMemoryUsage();
            if (currentMemory > 0 && currentMemory > opts.memoryLimit) {
              throw new MergeMemoryError(
                `Memory usage exceeded during processing: ${Math.round(currentMemory / 1024 / 1024)}MB`,
                currentMemory
              );
            }
          }

          // Progress update - Fixed: Proper parentheses for calculation
          const fileProgressRatio = chunkEnd / pageIndices.length;
          const overallProgress = 30 + Math.round(
            ((fileIndex + fileProgressRatio) / validatedFiles.length) * 60
          );
          
          throttledProgress(overallProgress, {
            phase: 'Copying pages',
            file: filename,
            page: processedPageCount
          });

          // Yield control to prevent blocking
          await new Promise(resolve => setTimeout(resolve, 1));

        } catch (error) {
          throw new MergeError(
            `Failed to copy pages from ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'PAGE_COPY_ERROR',
            { fileIndex, chunkStart, chunkEnd }
          );
        }
      }

      // Force garbage collection after each file
      await forceGarbageCollection();
    }

    throttledProgress(90, { phase: 'Finalizing merged PDF' });

    // Phase 4: Save the merged document
    const saveOptions = opts.optimize ? {
      useObjectStreams: true, // Basic compression - not image recompression
      addDefaultPage: false,
      updateFieldAppearances: true
    } : {};

    const mergedBytes = await mergedDoc.save(saveOptions);
    const finalMemoryUsage = getCurrentMemoryUsage();

    throttledProgress(100, { phase: 'Merge completed!' });

    // Calculate metrics
    const processingTime = Date.now() - startTime;
    const compressionRatio = mergedBytes.byteLength / totalOriginalSize; // Output/Input ratio

    return {
      success: true,
      data: mergedBytes,
      metadata: {
        totalPages,
        totalFiles: files.length,
        originalTotalSize: totalOriginalSize,
        mergedSize: mergedBytes.byteLength,
        processingTimeMs: processingTime,
        compressionRatio,
        filesProcessed,
        warningsCount: warnings.length,
        perFileDetails
      },
      warnings,
      details: {
        finalMemoryUsage,
        chunksProcessed: Math.ceil(totalPages / MERGE_CHUNK_SIZE),
        optimizationEnabled: opts.optimize,
        validationSkipped: !opts.validateInputs
      }
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    let errorMessage = 'PDF merge failed';
    let errorCode = 'UNKNOWN_ERROR';
    let details: Record<string, any> = {};

    if (error instanceof MergeError) {
      errorMessage = error.message;
      errorCode = error.code || 'MERGE_ERROR';
      details = error.details || {};
    } else if (error instanceof Error) {
      errorMessage = error.message;
      
      // Categorize common errors
      if (error.message.includes('memory') || error.message.includes('Memory')) {
        errorCode = 'MEMORY_ERROR';
      } else if (error.message.includes('password') || error.message.includes('encrypted')) {
        errorCode = 'ENCRYPTION_ERROR';
      } else if (error.message.includes('corrupted') || error.message.includes('invalid')) {
        errorCode = 'CORRUPTION_ERROR';
      } else if (error.message.includes('page')) {
        errorCode = 'PAGE_ERROR';
      }
    }

    return {
      success: false,
      error: errorMessage,
      warnings,
      metadata: {
        totalPages: 0,
        totalFiles: files.length,
        originalTotalSize: totalOriginalSize,
        mergedSize: 0,
        processingTimeMs: processingTime,
        compressionRatio: 1,
        filesProcessed,
        warningsCount: warnings.length,
        perFileDetails
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
 * Merge PDFs from File objects (browser convenience)
 */
export async function mergePDFFiles(
  files: File[],
  options: Partial<MergeOptions> = {}
): Promise<MergeResult> {
  if (!isBrowser) {
    throw new Error('mergePDFFiles is only available in browser environment');
  }

  try {
    // Convert File objects to MergeFileInput
    const mergeInputs: MergeFileInput[] = await Promise.all(
      files.map(async (file) => ({
        data: await file.arrayBuffer(),
        filename: file.name
      }))
    );

    return await mergePDFs(mergeInputs, options);
  } catch (error) {
    return {
      success: false,
      error: `File conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      warnings: []
    };
  }
}

/**
 * Simple merge function for basic use cases
 */
export async function simpleMergePDFs(
  pdfsData: ArrayBuffer[],
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; data?: Uint8Array; error?: string }> {
  const mergeInputs: MergeFileInput[] = pdfsData.map((data, index) => ({
    data,
    filename: `PDF ${index + 1}`
  }));

  const progressCallback = onProgress 
    ? (progress: number, _info?: ProgressInfo) => onProgress(progress)
    : undefined;

  const result = await mergePDFs(mergeInputs, { onProgress: progressCallback });

  return {
    success: result.success,
    data: result.data,
    error: result.error
  };
}

// === UTILITY EXPORTS ===
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']; // Added TB for large batches
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const sizeIndex = Math.min(i, sizes.length - 1);
  
  return parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(2)) + ' ' + sizes[sizeIndex];
};

/**
 * Estimate merge processing time based on file characteristics
 * Note: This is used by UI components for progress estimation
 */
export const estimateMergeTime = (totalPages: number, totalSize: number): number => {
  // Rough estimate: 50ms per page + 0.5ms per KB
  const pageTime = totalPages * 50;
  const sizeTime = (totalSize / 1024) * 0.5;
  return Math.max(1000, pageTime + sizeTime); // Minimum 1 second
};

// === DEFAULT EXPORT ===
export default {
  mergePDFs,
  mergePDFFiles,
  simpleMergePDFs,
  formatFileSize,
  estimateMergeTime,
  MergeError,
  MergeValidationError,
  MergeMemoryError
};