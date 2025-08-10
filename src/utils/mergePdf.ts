// src/utils/pdf/merge.ts
// Streamlined PDF merge utility for PDfree.tools
// Client-side processing with pdf-lib

import { PDFDocument } from 'pdf-lib';

/**
 * Custom error types for better error handling
 */
export class MergeError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'MergeError';
  }
}

export class ValidationError extends MergeError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ProcessingError extends MergeError {
  constructor(message: string) {
    super(message, 'PROCESSING_ERROR');
    this.name = 'ProcessingError';
  }
}

/**
 * Options for PDF merge operation
 */
export interface MergeOptions {
  /** Custom title for the merged PDF */
  title?: string;
  /** Custom author for the merged PDF */
  author?: string;
  /** Whether to preserve metadata from first PDF (default: true) */
  preserveFirstMetadata?: boolean;
}

/**
 * Merge multiple PDF files into a single document
 * @param files - Array of File objects to merge
 * @param options - Optional merge configuration
 * @returns Promise<Blob> - The merged PDF as a Blob
 * @throws MergeError if merge fails
 */
export async function merge(files: File[], options: MergeOptions = {}): Promise<Blob> {
  if (!files?.length) {
    throw new ValidationError('No files provided for merging');
  }

  // For single file, return a fresh Blob (not the original File object)
  if (files.length === 1) {
    const bytes = await files[0].arrayBuffer();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  // Validate all files are PDFs
  for (const file of files) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      throw new ValidationError(`File "${file.name}" is not a valid PDF`);
    }
  }

  // Create new merged document
  const mergedDoc = await PDFDocument.create();
  
  // Set metadata for the merged document
  const now = new Date();
  mergedDoc.setCreator('PDfree.tools');
  mergedDoc.setProducer('PDfree.tools - Free PDF Tools');
  mergedDoc.setCreationDate(now);
  mergedDoc.setModificationDate(now);
  mergedDoc.setKeywords(['Merged', 'PDfree.tools']);

  let firstFileMetadata: { title?: string; author?: string } | null = null;

  // Process each file
  for (const file of files) {
    try {
      // Read file data
      const fileData = await file.arrayBuffer();
      
      // Load the PDF document
      const sourceDoc = await PDFDocument.load(fileData);
      
      // Extract metadata from first file if requested
      if (firstFileMetadata === null && options.preserveFirstMetadata !== false) {
        try {
          firstFileMetadata = {
            title: sourceDoc.getTitle() || undefined,
            author: sourceDoc.getAuthor() || undefined
          };
        } catch {
          // Metadata extraction failed - not critical
          firstFileMetadata = {};
        }
      }
      
      // Get all page indices and copy pages
      const pageIndices = Array.from({ length: sourceDoc.getPageCount() }, (_, i) => i);
      const pages = await mergedDoc.copyPages(sourceDoc, pageIndices);
      pages.forEach(page => mergedDoc.addPage(page));
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Detect password-protected PDFs
      if (errorMsg.includes('password') || errorMsg.includes('encrypted') || errorMsg.includes('security')) {
        throw new ProcessingError(
          `File "${file.name}" appears to be password-protected. Password-protected PDFs cannot be merged client-side.`
        );
      }
      
      // Detect corrupted PDFs
      if (errorMsg.includes('corrupted') || errorMsg.includes('invalid') || errorMsg.includes('malformed')) {
        throw new ProcessingError(`File "${file.name}" appears to be corrupted or invalid.`);
      }
      
      throw new ProcessingError(`Failed to process file "${file.name}": ${errorMsg}`);
    }
  }

  // Apply metadata (custom options override preserved metadata)
  if (options.title) {
    mergedDoc.setTitle(options.title);
  } else if (firstFileMetadata?.title) {
    mergedDoc.setTitle(`${firstFileMetadata.title} (Merged)`);
  } else {
    mergedDoc.setTitle('Merged PDF');
  }

  if (options.author) {
    mergedDoc.setAuthor(options.author);
  } else if (firstFileMetadata?.author) {
    mergedDoc.setAuthor(firstFileMetadata.author);
  }

  // Save the merged document
  const mergedBytes = await mergedDoc.save();
  
  // Convert to Blob and return
  return new Blob([mergedBytes], { type: 'application/pdf' });
}

/**
 * Utility function to estimate merged file size (rough approximation)
 * @param files - Array of File objects
 * @returns Estimated size in bytes
 */
export function estimateMergedSize(files: File[]): number {
  // Simple sum of file sizes (actual merged size may be smaller due to compression)
  return files.reduce((total, file) => total + file.size, 0);
}

/**
 * Utility function to get total page count estimate
 * Note: This is a very rough approximation based on file size.
 * Scanned images or vector-heavy files can vary widely from this estimate.
 * @param files - Array of File objects
 * @returns Estimated total pages
 */
export function estimateTotalPages(files: File[]): number {
  // Very rough estimate: ~100KB per page on average
  // Note: Scanned PDFs or those with many images will be much larger per page
  const totalSize = files.reduce((total, file) => total + file.size, 0);
  return Math.max(1, Math.round(totalSize / (100 * 1024)));
}

/**
 * Validate that files can be merged
 * @param files - Array of File objects to validate
 * @returns Validation result with any issues
 */
export function validateMergeFiles(files: File[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!files || files.length === 0) {
    errors.push('No files selected');
    return { valid: false, errors };
  }
  
  // Check file count
  if (files.length > 50) {
    errors.push('Too many files selected (maximum: 50)');
  }
  
  // Check individual files
  for (const file of files) {
    // Check file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      errors.push(`"${file.name}" is not a valid PDF file`);
    }
    
    // Check file size (100MB limit per file)
    if (file.size > 100 * 1024 * 1024) {
      errors.push(`"${file.name}" is too large (maximum: 100MB per file)`);
    }
    
    // Check for empty files
    if (file.size === 0) {
      errors.push(`"${file.name}" is empty`);
    }
  }
  
  // Check total size (500MB limit)
  const totalSize = files.reduce((total, file) => total + file.size, 0);
  if (totalSize > 500 * 1024 * 1024) {
    errors.push('Total file size too large (maximum: 500MB total)');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Format file size for display
 * @param bytes - Size in bytes
 * @returns Formatted string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Default export
export default {
  merge,
  estimateMergedSize,
  estimateTotalPages,
  validateMergeFiles,
  formatFileSize
};
