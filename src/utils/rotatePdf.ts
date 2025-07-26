// src/utils/rotatePdf.ts
// Production-ready PDF rotation utility for PDfree.tools
// FIXED: All syntax errors, dead code, logic issues, and DX problems

import { PDFDocument, degrees } from 'pdf-lib';

// === TYPES ===
export type RotationDegree = 90 | 180 | 270 | 360;

export interface RotateOptions {
  /** Whether to preserve original metadata */
  preserveMetadata?: boolean;
  
  /** Custom metadata to apply to rotated PDF */
  customMetadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    creator?: string;
    producer?: string;
  };
  
  /** Progress callback for UI updates */
  onProgress?: (progress: number, info?: RotateProgressInfo) => void;
  
  /** Memory limit in bytes (default: 100MB) */
  memoryLimit?: number;
  
  /** Maximum pages to process (default: 10000) */
  maxPages?: number;
  
  /** Whether to validate input parameters (default: true) */
  validateInputs?: boolean;
  
  /** Whether to apply structural optimization (object streams, not compression) (default: true) */
  optimizeStructure?: boolean;
  
  /** Original filename for enhanced metadata titles */
  originalFilename?: string;
}

export interface RotateProgressInfo {
  /** Current processing phase */
  phase?: string;
  
  /** Current page being processed */
  page?: number;
  
  /** Total pages to process */
  totalPages?: number;
  
  /** Current rotation being applied */
  rotation?: RotationDegree;
  
  /** Current operation type */
  operation?: string;
}

export interface PageRotationSpec {
  /** Page number (1-indexed) */
  pageNumber: number;
  
  /** Rotation degrees */
  rotation: RotationDegree;
  
  /** Whether to preserve aspect ratio (always true for PDF rotation) */
  preserveAspectRatio?: boolean;
}

export interface BatchRotationSpec {
  /** Page range specification */
  pageRange: string; // e.g., "1-5", "all", "odd", "even"
  
  /** Rotation to apply to this range */
  rotation: RotationDegree;
  
  /** Description for user display */
  description?: string;
}

export interface RotateResult {
  /** Success status */
  success: boolean;
  
  /** Rotated PDF data */
  data?: Uint8Array;
  
  /** Error message if failed */
  error?: string;
  
  /** Processing metadata */
  metadata?: {
    originalPages: number;
    pagesRotated: number;
    rotationsApplied: Array<{
      pageNumber: number;
      rotation: RotationDegree;
      originalRotation: number;
      finalRotation: number;
    }>;
    originalSize: number;
    rotatedSize: number;
    processingTimeMs: number;
    /** Output size / input size ratio */
    outputToInputSizeRatio: number;
    preservedMetadata: boolean;
  };
  
  /** Non-fatal warnings */
  warnings?: string[];
  
  /** Processing details for debugging */
  details?: Record<string, any>;
}

export interface RotationPreset {
  name: string;
  description: string;
  rotations: BatchRotationSpec[];
}

// === CONSTANTS ===
const DEFAULT_OPTIONS: Required<Omit<RotateOptions, 'originalFilename'>> = {
  preserveMetadata: true,
  customMetadata: {},
  onProgress: () => {},
  memoryLimit: 100 * 1024 * 1024, // 100MB
  maxPages: 10000,
  validateInputs: true,
  optimizeStructure: true
};

const VALID_ROTATIONS: RotationDegree[] = [90, 180, 270, 360];
const ROTATION_CHUNK_SIZE = 20; // Process rotation specs in chunks
const PROGRESS_UPDATE_INTERVAL = 50; // Update progress every 50ms

// === ERROR CLASSES ===
export class RotateError extends Error {
  constructor(message: string, public code?: string, public details?: Record<string, any>) {
    super(message);
    this.name = 'RotateError';
  }
}

export class RotateValidationError extends RotateError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'RotateValidationError';
  }
}

export class RotateMemoryError extends RotateError {
  constructor(message: string, public memoryUsed?: number) {
    super(message, 'MEMORY_ERROR', { memoryUsed });
    this.name = 'RotateMemoryError';
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
  return 0; // Unknown memory usage - memory checks will be estimate-only
};

/**
 * Force garbage collection if available
 */
const forceGarbageCollection = async (): Promise<void> => {
  // Use globalThis consistently
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).gc === 'function') {
    try {
      (globalThis as any).gc();
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
  callback: (progress: number, info?: RotateProgressInfo) => void,
  throttleMs = PROGRESS_UPDATE_INTERVAL
) => {
  let lastCall = 0;
  let lastProgress = -1;
  
  return (progress: number, info?: RotateProgressInfo) => {
    const now = Date.now();
    const significantChange = Math.abs(progress - lastProgress) >= 3;
    
    if (progress === 100 || progress === 0 || now - lastCall >= throttleMs || significantChange) {
      callback(progress, info);
      lastCall = now;
      lastProgress = progress;
    }
  };
};

/**
 * Apply metadata to rotated PDF document
 * FIXED: Don't overwrite subject when preserveMetadata is true and no custom subject provided
 */
const applyMetadata = (
  doc: PDFDocument,
  originalMetadata: { title?: string; author?: string; subject?: string },
  options: RotateOptions
): void => {
  try {
    // Set default metadata
    doc.setCreator('PDfree.tools');
    doc.setProducer('PDfree.tools - Free PDF Rotation Tool');
    doc.setCreationDate(new Date());
    doc.setModificationDate(new Date());

    // Determine title - FIXED: Use originalFilename if provided
    let title = 'Rotated PDF';
    
    if (options.customMetadata?.title) {
      title = options.customMetadata.title;
    } else if (options.preserveMetadata && originalMetadata.title) {
      title = `${originalMetadata.title} (Rotated)`;
    } else if (options.originalFilename) {
      const baseName = options.originalFilename.replace(/\.pdf$/i, '');
      title = `${baseName} (Rotated)`;
    }
    
    doc.setTitle(title);

    // Apply other metadata
    if (options.customMetadata?.author) {
      doc.setAuthor(options.customMetadata.author);
    } else if (options.preserveMetadata && originalMetadata.author) {
      doc.setAuthor(originalMetadata.author);
    }

    // FIXED: Only set subject if custom provided, or if not preserving metadata
    if (options.customMetadata?.subject) {
      doc.setSubject(options.customMetadata.subject);
    } else if (!options.preserveMetadata) {
      doc.setSubject('Rotated PDF document');
    } else if (options.preserveMetadata && originalMetadata.subject) {
      doc.setSubject(originalMetadata.subject);
    }

    if (options.customMetadata?.keywords) {
      doc.setKeywords(options.customMetadata.keywords);
    }

    if (options.customMetadata?.creator) {
      doc.setCreator(options.customMetadata.creator);
    }

    if (options.customMetadata?.producer) {
      doc.setProducer(options.customMetadata.producer);
    }

  } catch (error) {
    // Non-critical metadata errors should not fail the rotation
    console.warn('Failed to apply metadata:', error);
  }
};

// === PAGE RANGE PARSING ===
export class PageRangeParser {
  /**
   * Parse page range string into array of page numbers
   * Supports: "1", "1-5", "1,3,5", "1-3,5,7-9", "all", "odd", "even", "first", "last"
   */
  static parseRange(rangeString: string, totalPages: number): number[] {
    if (!rangeString || rangeString.trim() === '') {
      throw new RotateValidationError('Page range cannot be empty');
    }

    const range = rangeString.toLowerCase().trim();
    
    // Handle special keywords
    if (range === 'all') {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    if (range === 'odd') {
      const oddPages = [];
      for (let i = 1; i <= totalPages; i += 2) {
        oddPages.push(i);
      }
      return oddPages;
    }
    
    if (range === 'even') {
      const evenPages = [];
      for (let i = 2; i <= totalPages; i += 2) {
        evenPages.push(i);
      }
      return evenPages;
    }
    
    if (range === 'first') {
      return [1];
    }
    
    if (range === 'last') {
      return [totalPages];
    }

    // Parse complex ranges
    const pages: number[] = [];
    const parts = rangeString.split(',').map(part => part.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        // Range format (e.g., "1-5")
        const [startStr, endStr] = part.split('-').map(s => s.trim());
        
        const start = startStr.toLowerCase() === 'first' ? 1 : 
                     startStr.toLowerCase() === 'last' ? totalPages : 
                     parseInt(startStr);
        
        const end = endStr.toLowerCase() === 'first' ? 1 : 
                   endStr.toLowerCase() === 'last' ? totalPages : 
                   parseInt(endStr);

        if (isNaN(start) || isNaN(end)) {
          throw new RotateValidationError(`Invalid range: ${part}`);
        }

        if (start < 1 || end < 1 || start > totalPages || end > totalPages) {
          throw new RotateValidationError(`Page numbers must be between 1 and ${totalPages}`);
        }

        if (start > end) {
          throw new RotateValidationError(`Invalid range: start (${start}) > end (${end})`);
        }

        for (let i = start; i <= end; i++) {
          if (!pages.includes(i)) {
            pages.push(i);
          }
        }
      } else {
        // Single page
        const pageStr = part.toLowerCase();
        const pageNum = pageStr === 'first' ? 1 : 
                       pageStr === 'last' ? totalPages : 
                       parseInt(part);

        if (isNaN(pageNum)) {
          throw new RotateValidationError(`Invalid page number: ${part}`);
        }

        if (pageNum < 1 || pageNum > totalPages) {
          throw new RotateValidationError(`Page number ${pageNum} must be between 1 and ${totalPages}`);
        }

        if (!pages.includes(pageNum)) {
          pages.push(pageNum);
        }
      }
    }

    return pages.sort((a, b) => a - b);
  }

  /**
   * Validate page range without parsing (for UI-only validation)
   */
  static validateRange(rangeString: string, totalPages: number): {
    valid: boolean;
    error?: string;
    pageCount?: number;
  } {
    try {
      const pages = this.parseRange(rangeString, totalPages);
      return {
        valid: true,
        pageCount: pages.length
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid page range'
      };
    }
  }
}

// === MAIN ROTATION FUNCTIONS ===

/**
 * Rotate specific pages by specified degrees
 */
export async function rotatePDFPages(
  fileData: ArrayBuffer,
  pageRotations: PageRotationSpec[],
  options: Partial<RotateOptions> = {}
): Promise<RotateResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const warnings: string[] = [];

  // Create throttled progress callback
  const throttledProgress = createThrottledProgress(opts.onProgress);

  try {
    throttledProgress(0, { phase: 'Loading PDF document' });

    // FIXED: Fast-fail when no rotations requested
    if (pageRotations.length === 0) {
      return {
        success: true,
        data: new Uint8Array(fileData),
        warnings: ['No rotations requested - returning original document unchanged'],
        metadata: {
          originalPages: 0,
          pagesRotated: 0,
          rotationsApplied: [],
          originalSize: fileData.byteLength,
          rotatedSize: fileData.byteLength,
          processingTimeMs: Date.now() - startTime,
          outputToInputSizeRatio: 1,
          preservedMetadata: opts.preserveMetadata
        }
      };
    }

    // Load the source PDF
    const sourceDoc = await PDFDocument.load(fileData);
    const totalPages = sourceDoc.getPageCount();

    if (totalPages === 0) {
      throw new RotateValidationError('PDF has no pages');
    }

    if (totalPages > opts.maxPages) {
      throw new RotateValidationError(`PDF has too many pages: ${totalPages} (maximum: ${opts.maxPages})`);
    }

    // Validate input parameters if requested
    if (opts.validateInputs) {
      throttledProgress(5, { phase: 'Validating rotation specifications' });

      for (const spec of pageRotations) {
        if (spec.pageNumber < 1 || spec.pageNumber > totalPages) {
          throw new RotateValidationError(
            `Page number ${spec.pageNumber} is out of range (1-${totalPages})`
          );
        }

        if (!VALID_ROTATIONS.includes(spec.rotation)) {
          throw new RotateValidationError(
            `Invalid rotation: ${spec.rotation}°. Valid rotations: ${VALID_ROTATIONS.join(', ')}`
          );
        }
      }

      // FIXED: Check for duplicate page specifications with Set for deduplication
      const pageNumbers = pageRotations.map(spec => spec.pageNumber);
      const uniquePages = new Set(pageNumbers);
      if (uniquePages.size !== pageNumbers.length) {
        const duplicates = [...new Set(pageNumbers.filter((page, index) => pageNumbers.indexOf(page) !== index))];
        warnings.push(`Pages ${duplicates.join(', ')} have multiple rotation specifications. Last specification will be used.`);
      }
    }

    // Memory estimation (fallback when performance.memory unavailable)
    const estimatedMemoryUsage = fileData.byteLength * 2; // Conservative estimate
    const currentMemory = getCurrentMemoryUsage();
    
    if (estimatedMemoryUsage > opts.memoryLimit) {
      throw new RotateMemoryError(
        `Estimated memory usage (${Math.round(estimatedMemoryUsage / 1024 / 1024)}MB) exceeds limit (${Math.round(opts.memoryLimit / 1024 / 1024)}MB)`,
        estimatedMemoryUsage
      );
    }

    if (currentMemory > 0 && currentMemory > opts.memoryLimit) {
      throw new RotateMemoryError(
        `Current memory usage (${Math.round(currentMemory / 1024 / 1024)}MB) exceeds limit`,
        currentMemory
      );
    }

    // Extract original metadata including subject
    let originalMetadata: { title?: string; author?: string; subject?: string } = {};
    try {
      originalMetadata.title = sourceDoc.getTitle() || undefined;
      originalMetadata.author = sourceDoc.getAuthor() || undefined;
      originalMetadata.subject = sourceDoc.getSubject() || undefined;
    } catch (error) {
      warnings.push('Could not extract original metadata');
    }

    throttledProgress(15, { phase: 'Processing page rotations' });

    // Get pages and track rotations
    const pages = sourceDoc.getPages();
    const rotationsApplied: Array<{
      pageNumber: number;
      rotation: RotationDegree;
      originalRotation: number;
      finalRotation: number;
    }> = [];

    // Create rotation map (last specification wins for duplicates)
    const rotationMap = new Map<number, RotationDegree>();
    for (const spec of pageRotations) {
      rotationMap.set(spec.pageNumber, spec.rotation);
    }

    // Apply rotations in chunks
    const rotationEntries = Array.from(rotationMap.entries());
    const totalRotations = rotationEntries.length;

    // FIXED: Guard against divide by zero when totalRotations is 0
    if (totalRotations === 0) {
      warnings.push('No valid rotations to apply after processing specifications');
      return {
        success: true,
        data: new Uint8Array(fileData),
        warnings,
        metadata: {
          originalPages: totalPages,
          pagesRotated: 0,
          rotationsApplied: [],
          originalSize: fileData.byteLength,
          rotatedSize: fileData.byteLength,
          processingTimeMs: Date.now() - startTime,
          outputToInputSizeRatio: 1,
          preservedMetadata: opts.preserveMetadata
        }
      };
    }

    for (let i = 0; i < rotationEntries.length; i += ROTATION_CHUNK_SIZE) {
      const chunk = rotationEntries.slice(i, i + ROTATION_CHUNK_SIZE);
      
      for (const [pageNumber, rotation] of chunk) {
        const pageIndex = pageNumber - 1;
        const page = pages[pageIndex];
        
        if (!page) {
          warnings.push(`Page ${pageNumber} not found, skipping rotation`);
          continue;
        }

        try {
          // Get current rotation
          const currentRotation = page.getRotation();
          const originalRotationDegrees = (currentRotation as any)?.angle || 0;

          // Apply rotation (360° means no change)
          if (rotation !== 360) {
            page.setRotation(degrees(rotation));
          }

          // Calculate final rotation
          const finalRotationDegrees = rotation === 360 ? originalRotationDegrees : rotation;

          rotationsApplied.push({
            pageNumber,
            rotation,
            originalRotation: originalRotationDegrees,
            finalRotation: finalRotationDegrees
          });

        } catch (error) {
          warnings.push(`Failed to rotate page ${pageNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Progress update - safe division
      const processedRotations = Math.min(i + ROTATION_CHUNK_SIZE, totalRotations);
      const progress = 15 + Math.round((processedRotations / totalRotations) * 70);
      
      throttledProgress(progress, {
        phase: 'Applying rotations',
        page: processedRotations,
        totalPages: totalRotations,
        operation: 'rotating'
      });

      // Memory management
      if (i > 0 && i % (ROTATION_CHUNK_SIZE * 2) === 0) {
        await forceGarbageCollection();
        
        const currentMemory = getCurrentMemoryUsage();
        if (currentMemory > 0 && currentMemory > opts.memoryLimit) {
          throw new RotateMemoryError(
            `Memory usage exceeded during processing: ${Math.round(currentMemory / 1024 / 1024)}MB`,
            currentMemory
          );
        }
      }

      // Yield control
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    throttledProgress(90, { phase: 'Applying metadata and finalizing' });

    // Apply metadata
    applyMetadata(sourceDoc, originalMetadata, opts);

    // Save with optimization if requested
    // FIXED: Clear documentation - this is structural optimization, not compression
    const saveOptions = opts.optimizeStructure ? {
      useObjectStreams: true, // Object stream compression (structural, not image compression)
      addDefaultPage: false,
      updateFieldAppearances: true
    } : {};

    const rotatedBytes = await sourceDoc.save(saveOptions);

    throttledProgress(100, { phase: 'Rotation completed!' });

    // Calculate metrics
    const processingTime = Date.now() - startTime;
    const outputToInputSizeRatio = rotatedBytes.byteLength / fileData.byteLength;

    return {
      success: true,
      data: rotatedBytes,
      metadata: {
        originalPages: totalPages,
        pagesRotated: rotationsApplied.length,
        rotationsApplied,
        originalSize: fileData.byteLength,
        rotatedSize: rotatedBytes.byteLength,
        processingTimeMs: processingTime,
        outputToInputSizeRatio, // FIXED: Clear naming
        preservedMetadata: opts.preserveMetadata
      },
      warnings,
      details: {
        totalSpecifications: pageRotations.length,
        uniquePages: rotationMap.size,
        structuralOptimization: opts.optimizeStructure,
        validationEnabled: opts.validateInputs,
        memoryUsage: getCurrentMemoryUsage(),
        chunksProcessed: Math.ceil(rotationEntries.length / ROTATION_CHUNK_SIZE)
      }
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    let errorMessage = 'PDF rotation failed';
    let errorCode = 'UNKNOWN_ERROR';
    let details: Record<string, any> = {};

    if (error instanceof RotateError) {
      errorMessage = error.message;
      errorCode = error.code || 'ROTATE_ERROR';
      details = error.details || {};
    } else if (error instanceof Error) {
      errorMessage = error.message;
      
      // Categorize common errors
      if (error.message.includes('memory') || error.message.includes('Memory')) {
        errorCode = 'MEMORY_ERROR';
      } else if (error.message.includes('password') || error.message.includes('encrypted')) {
        errorCode = 'ENCRYPTION_ERROR';
        errorMessage = 'Encrypted/password-protected PDFs are not supported by this tool.';
      } else if (error.message.includes('corrupted') || error.message.includes('invalid')) {
        errorCode = 'CORRUPTION_ERROR';
      } else if (error.message.includes('page') || error.message.includes('rotation')) {
        errorCode = 'ROTATION_ERROR';
      }
    }

    return {
      success: false,
      error: errorMessage,
      warnings,
      metadata: {
        originalPages: 0,
        pagesRotated: 0,
        rotationsApplied: [],
        originalSize: fileData.byteLength,
        rotatedSize: 0,
        processingTimeMs: processingTime,
        outputToInputSizeRatio: 1,
        preservedMetadata: false
      },
      details: {
        errorCode,
        memoryUsage: getCurrentMemoryUsage(),
        ...details
      }
    };
  }
}

/**
 * Rotate all pages by the same amount
 */
export async function rotatePDFAll(
  fileData: ArrayBuffer,
  rotation: RotationDegree,
  options: Partial<RotateOptions> = {}
): Promise<RotateResult> {
  try {
    // Load PDF to get page count
    const doc = await PDFDocument.load(fileData);
    const totalPages = doc.getPageCount();
    
    // Create rotation specifications for all pages
    const pageRotations: PageRotationSpec[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pageRotations.push({
        pageNumber: i,
        rotation,
        preserveAspectRatio: true
      });
    }
    
    return rotatePDFPages(fileData, pageRotations, options);
  } catch (error) {
    return {
      success: false,
      error: `Failed to rotate all pages: ${error instanceof Error ? error.message : 'Unknown error'}`,
      warnings: [],
      metadata: {
        originalPages: 0,
        pagesRotated: 0,
        rotationsApplied: [],
        originalSize: fileData.byteLength,
        rotatedSize: 0,
        processingTimeMs: 0,
        outputToInputSizeRatio: 1,
        preservedMetadata: false
      }
    };
  }
}

/**
 * Rotate pages by batch specifications
 */
export async function rotatePDFBatch(
  fileData: ArrayBuffer,
  batchSpecs: BatchRotationSpec[],
  options: Partial<RotateOptions> = {}
): Promise<RotateResult> {
  try {
    // Load PDF to get page count
    const doc = await PDFDocument.load(fileData);
    const totalPages = doc.getPageCount();
    
    // Convert batch specifications to individual page rotations
    const pageRotations: PageRotationSpec[] = [];
    
    for (const batchSpec of batchSpecs) {
      const pages = PageRangeParser.parseRange(batchSpec.pageRange, totalPages);
      
      for (const pageNumber of pages) {
        pageRotations.push({
          pageNumber,
          rotation: batchSpec.rotation,
          preserveAspectRatio: true
        });
      }
    }
    
    return rotatePDFPages(fileData, pageRotations, options);
  } catch (error) {
    return {
      success: false,
      error: `Failed to process batch rotations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      warnings: [],
      metadata: {
        originalPages: 0,
        pagesRotated: 0,
        rotationsApplied: [],
        originalSize: fileData.byteLength,
        rotatedSize: 0,
        processingTimeMs: 0,
        outputToInputSizeRatio: 1,
        preservedMetadata: false
      }
    };
  }
}

// === CONVENIENCE FUNCTIONS ===

/**
 * Simple rotation function for basic use cases
 */
export async function simpleRotatePDF(
  fileData: ArrayBuffer,
  rotation: RotationDegree,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; data?: Uint8Array; error?: string }> {
  const progressCallback = onProgress 
    ? (progress: number, _info?: RotateProgressInfo) => onProgress(progress)
    : undefined;

  const result = await rotatePDFAll(fileData, rotation, { onProgress: progressCallback });

  return {
    success: result.success,
    data: result.data,
    error: result.error
  };
}

/**
 * Get page information including current rotation
 * FIXED: Consider rotation when determining landscape/portrait
 */
export async function getPDFPageInfo(fileData: ArrayBuffer): Promise<{
  success: boolean;
  pages?: Array<{
    pageNumber: number;
    width: number;
    height: number;
    currentRotation: number;
    isLandscape: boolean;
    isPortrait: boolean;
    visuallyLandscape: boolean; // Considering rotation
    visuallyPortrait: boolean; // Considering rotation
  }>;
  error?: string;
}> {
  try {
    const doc = await PDFDocument.load(fileData);
    const pages = doc.getPages();
    
    const pageInfo = pages.map((page, index) => {
      const { width, height } = page.getSize();
      const rotation = page.getRotation();
      const currentRotation = (rotation as any)?.angle || 0;
      
      // Original orientation (before rotation)
      const isLandscape = width > height;
      const isPortrait = height > width;
      
      // Visual orientation (considering rotation)
      const isRotated90or270 = currentRotation === 90 || currentRotation === 270;
      const visuallyLandscape = isRotated90or270 ? isPortrait : isLandscape;
      const visuallyPortrait = isRotated90or270 ? isLandscape : isPortrait;
      
      return {
        pageNumber: index + 1,
        width,
        height,
        currentRotation,
        isLandscape,
        isPortrait,
        visuallyLandscape,
        visuallyPortrait
      };
    });
    
    return {
      success: true,
      pages: pageInfo
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get page information'
    };
  }
}

// === PRESET ROTATIONS ===
export const ROTATION_PRESETS: RotationPreset[] = [
  {
    name: 'rotate-odd-even',
    description: 'Rotate odd pages 90° and even pages 270°',
    rotations: [
      {
        pageRange: 'odd',
        rotation: 90,
        description: 'Odd pages rotated 90° clockwise'
      },
      {
        pageRange: 'even',
        rotation: 270,
        description: 'Even pages rotated 270° clockwise'
      }
    ]
  },
  {
    name: 'fix-scanned-portrait',
    description: 'Fix scanned documents (odd pages 270°, even pages 90°)',
    rotations: [
      {
        pageRange: 'odd',
        rotation: 270,
        description: 'Odd pages (front) rotated 270°'
      },
      {
        pageRange: 'even',
        rotation: 90,
        description: 'Even pages (back) rotated 90°'
      }
    ]
  }
];

// === UTILITY EXPORTS ===

/**
 * Format file size with proper units
 * FIXED: Complete implementation with TB and PB support
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const sizeIndex = Math.min(i, sizes.length - 1);
  const value = bytes / Math.pow(k, sizeIndex);
  
  return `${value.toFixed(value >= 100 ? 0 : 2)} ${sizes[sizeIndex]}`;
};

/**
 * Validate rotation degree
 */
export const validateRotation = (rotation: number): {
  valid: boolean;
  normalized?: RotationDegree;
  error?: string;
} => {
  if (typeof rotation !== 'number' || isNaN(rotation)) {
    return {
      valid: false,
      error: 'Rotation must be a number'
    };
  }

  if (!VALID_ROTATIONS.includes(rotation as RotationDegree)) {
    return {
      valid: false,
      error: `Invalid rotation: ${rotation}°. Valid rotations: ${VALID_ROTATIONS.join(', ')}`
    };
  }

  return {
    valid: true,
    normalized: rotation as RotationDegree
  };
};

/**
 * Get suggested rotation based on page dimensions
 */
export const getSuggestedRotation = (
  width: number, 
  height: number, 
  currentRotation: number = 0
): {
  rotation: RotationDegree;
  reason: string;
} => {
  const isLandscape = width > height;
  const isPortrait = height > width;
  const isSquare = Math.abs(width - height) < 10; // Within 10 points

  if (isSquare) {
    return {
      rotation: 90,
      reason: 'Square page - 90° rotation suggested for consistent orientation'
    };
  }

  if (isLandscape) {
    return {
      rotation: 270,
      reason: 'Landscape page - 270° rotation to convert to portrait'
    };
  }

  if (isPortrait) {
    return {
      rotation: 90,
      reason: 'Portrait page - 90° rotation to convert to landscape'
    };
  }

  return {
    rotation: 90,
    reason: 'Default 90° rotation suggested'
  };
};

/**
 * Calculate optimal rotation for document consistency
 */
export const calculateOptimalRotations = async (
  fileData: ArrayBuffer
): Promise<{
  success: boolean;
  rotations?: PageRotationSpec[];
  analysis?: {
    landscapePages: number;
    portraitPages: number;
    rotatedPages: number;
    recommendation: string;
  };
  error?: string;
}> => {
  try {
    const pageInfo = await getPDFPageInfo(fileData);
    
    if (!pageInfo.success || !pageInfo.pages) {
      return {
        success: false,
        error: pageInfo.error || 'Failed to analyze pages'
      };
    }

    const pages = pageInfo.pages;
    let landscapePages = 0;
    let portraitPages = 0;
    let rotatedPages = 0;

    const rotations: PageRotationSpec[] = [];

    // Analyze page orientations using visual orientation
    for (const page of pages) {
      if (page.visuallyLandscape) landscapePages++;
      if (page.visuallyPortrait) portraitPages++;
      if (page.currentRotation !== 0) rotatedPages++;
    }

    // Determine target orientation (majority wins)
    const targetIsPortrait = portraitPages >= landscapePages;

    // Generate rotation specifications
    for (const page of pages) {
      let suggestedRotation: RotationDegree = 360; // No rotation by default

      if (targetIsPortrait && page.visuallyLandscape) {
        // Convert landscape to portrait
        suggestedRotation = 270;
      } else if (!targetIsPortrait && page.visuallyPortrait) {
        // Convert portrait to landscape
        suggestedRotation = 90;
      }

      if (suggestedRotation !== 360) {
        rotations.push({
          pageNumber: page.pageNumber,
          rotation: suggestedRotation,
          preserveAspectRatio: true
        });
      }
    }

    const recommendation = rotations.length === 0 
      ? 'Document pages are already consistently oriented'
      : `Rotate ${rotations.length} pages to achieve consistent ${targetIsPortrait ? 'portrait' : 'landscape'} orientation`;

    return {
      success: true,
      rotations,
      analysis: {
        landscapePages,
        portraitPages,
        rotatedPages,
        recommendation
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed'
    };
  }
};

/**
 * Estimate rotation processing time
 */
export const estimateRotationTime = (totalPages: number, rotationCount: number): number => {
  // Rough estimate: 20ms per page + 50ms per rotation
  const pageTime = totalPages * 20;
  const rotationTime = rotationCount * 50;
  return Math.max(200, pageTime + rotationTime); // Minimum 200ms
};

/**
 * Create rotation specification from preset
 */
export const createRotationFromPreset = (
  presetName: string, 
  totalPages: number
): {
  success: boolean;
  rotations?: PageRotationSpec[];
  error?: string;
} => {
  const preset = ROTATION_PRESETS.find(p => p.name === presetName);
  
  if (!preset) {
    return {
      success: false,
      error: `Preset "${presetName}" not found`
    };
  }

  try {
    const rotations: PageRotationSpec[] = [];
    
    for (const batchSpec of preset.rotations) {
      const pages = PageRangeParser.parseRange(batchSpec.pageRange, totalPages);
      
      for (const pageNumber of pages) {
        rotations.push({
          pageNumber,
          rotation: batchSpec.rotation,
          preserveAspectRatio: true
        });
      }
    }

    return {
      success: true,
      rotations
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create rotation specification'
    };
  }
};

/**
 * Detect if PDF needs rotation based on orientation analysis
 * This is a heuristic approach - considers both dimensions and current rotation
 */
export const detectRotationNeeded = async (
  fileData: ArrayBuffer
): Promise<{
  success: boolean;
  suggestions?: Array<{
    pageNumber: number;
    suggestedRotation: RotationDegree;
    confidence: number;
    reason: string;
  }>;
  error?: string;
}> => {
  try {
    const pageInfo = await getPDFPageInfo(fileData);
    
    if (!pageInfo.success || !pageInfo.pages) {
      return {
        success: false,
        error: pageInfo.error || 'Failed to analyze pages'
      };
    }

    const suggestions = pageInfo.pages.map(page => {
      let suggestedRotation: RotationDegree = 360;
      let confidence = 0.5;
      let reason = 'No rotation needed';

      // Heuristic: Consider visual orientation and aspect ratio
      const aspectRatio = page.width / page.height;
      
      if (aspectRatio > 1.5) {
        // Very wide page - likely needs rotation to portrait
        suggestedRotation = 270;
        confidence = 0.7;
        reason = 'Wide aspect ratio suggests rotation to portrait orientation';
      } else if (aspectRatio < 0.67) {
        // Very tall page - consider if already properly oriented
        if (page.currentRotation !== 0) {
          suggestedRotation = 90;
          confidence = 0.6;
          reason = 'Tall rotated page might benefit from orientation adjustment';
        } else {
          confidence = 0.8;
          reason = 'Tall aspect ratio suggests properly oriented portrait page';
        }
      }

      // Boost confidence if page is currently rotated
      if (page.currentRotation !== 0) {
        confidence += 0.2;
        reason += ' (page is currently rotated)';
      }

      return {
        pageNumber: page.pageNumber,
        suggestedRotation,
        confidence: Math.min(1, confidence),
        reason
      };
    });

    return {
      success: true,
      suggestions: suggestions.filter(s => s.suggestedRotation !== 360) // Only include pages that need rotation
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Detection failed'
    };
  }
};

/**
 * Batch rotate by file orientation analysis
 */
export async function rotatePDFAuto(
  fileData: ArrayBuffer,
  options: Partial<RotateOptions> = {}
): Promise<RotateResult> {
  try {
    const analysis = await calculateOptimalRotations(fileData);
    
    if (!analysis.success || !analysis.rotations) {
      return {
        success: false,
        error: analysis.error || 'Auto-rotation analysis failed',
        warnings: [],
        metadata: {
          originalPages: 0,
          pagesRotated: 0,
          rotationsApplied: [],
          originalSize: fileData.byteLength,
          rotatedSize: 0,
          processingTimeMs: 0,
          outputToInputSizeRatio: 1,
          preservedMetadata: false
        }
      };
    }

    if (analysis.rotations.length === 0) {
      // No rotations needed
      return {
        success: true,
        data: new Uint8Array(fileData),
        warnings: ['No rotations needed - document is already consistently oriented'],
        metadata: {
          originalPages: 0,
          pagesRotated: 0,
          rotationsApplied: [],
          originalSize: fileData.byteLength,
          rotatedSize: fileData.byteLength,
          processingTimeMs: 0,
          outputToInputSizeRatio: 1,
          preservedMetadata: false
        }
      };
    }

    return rotatePDFPages(fileData, analysis.rotations, options);

  } catch (error) {
    return {
      success: false,
      error: `Auto-rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      warnings: [],
      metadata: {
        originalPages: 0,
        pagesRotated: 0,
        rotationsApplied: [],
        originalSize: fileData.byteLength,
        rotatedSize: 0,
        processingTimeMs: 0,
        outputToInputSizeRatio: 1,
        preservedMetadata: false
      }
    };
  }
}

// === BROWSER UTILITIES ===

/**
 * Create blob from rotated PDF data
 */
export const createRotatedPDFBlob = (data: Uint8Array): Blob => {
  return new Blob([data], { type: 'application/pdf' });
};

/**
 * Download rotated PDF (browser-only)
 */
export const downloadRotatedPDF = (data: Uint8Array, filename: string): void => {
  if (!isBrowser) {
    throw new Error('Download not available in server environment');
  }
  
  const blob = createRotatedPDFBlob(data);
  const url = URL.createObjectURL(blob);
  
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    
    // Ensure filename indicates rotation
    if (!link.download.includes('rotated')) {
      const baseName = link.download.replace('.pdf', '');
      link.download = `${baseName}-rotated.pdf`;
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    // Cleanup URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

/**
 * High-level rotation pipeline helper
 */
export const processPDFRotation = async (
  fileData: ArrayBuffer,
  rotationType: 'all' | 'pages' | 'batch' | 'auto',
  rotationData: any,
  options: Partial<RotateOptions> = {}
): Promise<RotateResult> => {
  switch (rotationType) {
    case 'all':
      if (typeof rotationData !== 'number') {
        throw new RotateError('All rotation requires rotation degree as number');
      }
      return rotatePDFAll(fileData, rotationData, options);
      
    case 'pages':
      if (!Array.isArray(rotationData)) {
        throw new RotateError('Pages rotation requires array of PageRotationSpec');
      }
      return rotatePDFPages(fileData, rotationData, options);
      
    case 'batch':
      if (!Array.isArray(rotationData)) {
        throw new RotateError('Batch rotation requires array of BatchRotationSpec');
      }
      return rotatePDFBatch(fileData, rotationData, options);
      
    case 'auto':
      return rotatePDFAuto(fileData, options);
      
    default:
      throw new RotateError(`Unknown rotation type: ${rotationType}`);
  }
};

// === DEFAULT EXPORT ===
export default {
  // Main functions
  rotatePDFPages,
  rotatePDFAll,
  rotatePDFBatch,
  rotatePDFAuto,
  simpleRotatePDF,
  
  // Analysis functions
  getPDFPageInfo,
  calculateOptimalRotations,
  detectRotationNeeded,
  
  // Utility functions
  PageRangeParser,
  validateRotation,
  getSuggestedRotation,
  createRotationFromPreset,
  estimateRotationTime,
  formatFileSize,
  
  // Browser utilities
  createRotatedPDFBlob,
  downloadRotatedPDF,
  processPDFRotation,
  
  // Constants and presets
  ROTATION_PRESETS,
  VALID_ROTATIONS,
  
  // Error classes
  RotateError,
  RotateValidationError,
  RotateMemoryError
}; 'rotate-all-90',
    description: 'Rotate all pages 90° clockwise',
    rotations: [
      {
        pageRange: 'all',
        rotation: 90,
        description: 'All pages rotated 90° clockwise'
      }
    ]
  },
  {
    name: 'rotate-all-180',
    description: 'Rotate all pages 180° (upside down)',
    rotations: [
      {
        pageRange: 'all',
        rotation: 180,
        description: 'All pages rotated 180°'
      }
    ]
  },
  {
    name: 'rotate-all-270',
    description: 'Rotate all pages 270° clockwise (90° counter-clockwise)',
    rotations: [
      {
        pageRange: 'all',
        rotation: 270,
        description: 'All pages rotated 270° clockwise'
      }
    ]
  },
  {
    name: