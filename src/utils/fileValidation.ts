// File Validation & Security System - Fixed Client-Side Foundation
// PDfree.tools - Production-Ready File Security (Fixed Critical Issues)

/**
 * File validation configuration and constants
 */
export const FILE_VALIDATION_CONFIG = {
  // Maximum file sizes (in bytes)
  MAX_FILE_SIZE: {
    PDF: 100 * 1024 * 1024, // 100MB for PDFs
    IMAGE: 50 * 1024 * 1024, // 50MB for images
    DOCUMENT: 25 * 1024 * 1024, // 25MB for docs
    DEFAULT: 10 * 1024 * 1024, // 10MB default
    UNKNOWN: 5 * 1024 * 1024, // 5MB for unknown types
  },
  
  // Allowed MIME types with security considerations
  ALLOWED_MIME_TYPES: {
    PDF: [
      'application/pdf',
    ],
    IMAGE: [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/gif',
    ],
    DOCUMENT: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
  },
  
  // File extensions (double-check against MIME)
  ALLOWED_EXTENSIONS: {
    PDF: ['.pdf'],
    IMAGE: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    DOCUMENT: ['.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'],
  },
  
  // Security boundaries
  MEMORY_LIMITS: {
    CLIENT_PROCESSING: 50 * 1024 * 1024, // 50MB max for client-side
    CONCURRENT_FILES: 3, // Max files processed simultaneously
    TIMEOUT_MS: 30000, // 30 second timeout for validation
  },
  
  // Security patterns to detect
  SECURITY_PATTERNS: {
    // Only truly dangerous executable signatures
    MALICIOUS_SIGNATURES: [
      '4D5A', // MZ header (Windows PE executable)
    ],
    
    // Suspicious JavaScript patterns in PDFs
    JS_PATTERNS: [
      /\/JavaScript\s*\(/i,
      /\/JS\s*\(/i,
      /\/Action\s*<</i,
      /app\.alert\s*\(/i,
      /this\.print\s*\(/i,
    ],
    
    // File path traversal attempts (fixed patterns without g flag for test())
    PATH_TRAVERSAL: [
      /\.\.\//i,
      /\.\.\\+/i,
      /%2e%2e%2f/i,
      /%2e%2e%5c/i,
    ],
  },
} as const;

/**
 * File validation error types for consistent error handling
 */
export enum ValidationErrorType {
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  SECURITY_THREAT = 'SECURITY_THREAT',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  TIMEOUT_EXCEEDED = 'TIMEOUT_EXCEEDED',
  INVALID_STRUCTURE = 'INVALID_STRUCTURE',
  MIME_MISMATCH = 'MIME_MISMATCH',
}

/**
 * Custom validation error class with user-friendly messages
 */
export class FileValidationError extends Error {
  constructor(
    public type: ValidationErrorType,
    public userMessage: string,
    public technicalDetails?: string
  ) {
    super(`${type}: ${userMessage}`);
    this.name = 'FileValidationError';
  }
  
  /**
   * Get user-friendly error message with suggested actions
   */
  getUserFriendlyMessage(): string {
    const baseMessage = this.userMessage;
    
    switch (this.type) {
      case ValidationErrorType.INVALID_FILE_TYPE:
        return `${baseMessage} Please upload a valid PDF, image, or document file.`;
      
      case ValidationErrorType.FILE_TOO_LARGE:
        return `${baseMessage} Try compressing your file or use our compression tool first.`;
      
      case ValidationErrorType.FILE_CORRUPTED:
        return `${baseMessage} Please check your file and try uploading again.`;
      
      case ValidationErrorType.SECURITY_THREAT:
        return `${baseMessage} For your security, we cannot process this file.`;
      
      case ValidationErrorType.MEMORY_LIMIT_EXCEEDED:
        return `${baseMessage} Try processing fewer files at once or use smaller files.`;
      
      case ValidationErrorType.MIME_MISMATCH:
        return `${baseMessage} The file content doesn't match its extension.`;
      
      default:
        return `${baseMessage} Please try again or contact support if the issue persists.`;
    }
  }
}

/**
 * File validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: FileValidationError;
  fileInfo: {
    name: string;
    originalName: string;
    size: number;
    type: string;
    detectedMimeType?: string;
    extension: string;
    category: keyof typeof FILE_VALIDATION_CONFIG.ALLOWED_MIME_TYPES | 'UNKNOWN';
  };
  securityInfo: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    detectedThreats: string[];
    requiresServerValidation: boolean;
    mimeMismatch: boolean;
  };
}

/**
 * Helper function to determine file category from extension
 */
export function getCategoryFromExtension(ext: string): keyof typeof FILE_VALIDATION_CONFIG.ALLOWED_MIME_TYPES | 'UNKNOWN' {
  const extension = ext.toLowerCase();
  
  if (FILE_VALIDATION_CONFIG.ALLOWED_EXTENSIONS.PDF.includes(extension)) return 'PDF';
  if (FILE_VALIDATION_CONFIG.ALLOWED_EXTENSIONS.IMAGE.includes(extension)) return 'IMAGE';
  if (FILE_VALIDATION_CONFIG.ALLOWED_EXTENSIONS.DOCUMENT.includes(extension)) return 'DOCUMENT';
  
  return 'UNKNOWN';
}

/**
 * Check if MIME type is allowed for the given category
 */
function isMimeAllowedForCategory(
  mime: string, 
  category: keyof typeof FILE_VALIDATION_CONFIG.ALLOWED_MIME_TYPES
): boolean {
  return FILE_VALIDATION_CONFIG.ALLOWED_MIME_TYPES[category].includes(mime);
}

/**
 * Core file validation class with comprehensive security checks
 */
export class FileValidator {
  private static instance: FileValidator;
  private processingCount = 0;
  private abortedValidations = new Set<string>();
  
  static getInstance(): FileValidator {
    if (!FileValidator.instance) {
      FileValidator.instance = new FileValidator();
    }
    return FileValidator.instance;
  }
  
  /**
   * Validate a single file with comprehensive security checks
   */
  async validateFile(file: File): Promise<ValidationResult> {
    // Check concurrent processing limits
    if (this.processingCount >= FILE_VALIDATION_CONFIG.MEMORY_LIMITS.CONCURRENT_FILES) {
      throw new FileValidationError(
        ValidationErrorType.MEMORY_LIMIT_EXCEEDED,
        'Too many files being processed simultaneously'
      );
    }
    
    this.processingCount++;
    const validationId = `${file.name}-${Date.now()}-${Math.random()}`;
    
    try {
      // Set timeout for validation with abort capability
      return await Promise.race([
        this._performValidation(file, validationId),
        this._createTimeoutPromise(validationId),
      ]);
    } finally {
      this.processingCount--;
      this.abortedValidations.delete(validationId);
    }
  }
  
  /**
   * Validate multiple files with batching and memory management
   */
  async validateFiles(files: FileList | File[]): Promise<ValidationResult[]> {
    const fileArray = Array.from(files);
    const results: ValidationResult[] = [];
    
    // Process in batches to manage memory
    const batchSize = Math.min(
      FILE_VALIDATION_CONFIG.MEMORY_LIMITS.CONCURRENT_FILES,
      fileArray.length
    );
    
    for (let i = 0; i < fileArray.length; i += batchSize) {
      const batch = fileArray.slice(i, i + batchSize);
      const batchPromises = batch.map(file => this.validateFile(file));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Handle validation errors
          const error = result.reason instanceof FileValidationError 
            ? result.reason 
            : new FileValidationError(
                ValidationErrorType.INVALID_STRUCTURE,
                'Unknown validation error occurred'
              );
          
          const file = batch[index];
          results.push({
            isValid: false,
            error,
            fileInfo: {
              name: this._sanitizeFileName(file?.name || 'unknown'),
              originalName: file?.name || 'unknown',
              size: file?.size || 0,
              type: file?.type || 'unknown',
              extension: this._getFileExtension(file?.name || ''),
              category: 'UNKNOWN',
            },
            securityInfo: {
              riskLevel: 'HIGH',
              detectedThreats: ['Validation failed'],
              requiresServerValidation: true,
              mimeMismatch: false,
            },
          });
        }
      });
    }
    
    return results;
  }
  
  /**
   * Perform comprehensive file validation
   */
  private async _performValidation(file: File, validationId: string): Promise<ValidationResult> {
    // Basic file info extraction
    const fileInfo = this._extractFileInfo(file);
    
    // Step 1: Basic validation (type, size, extension)
    await this._validateBasicProperties(file, fileInfo, validationId);
    
    // Step 2: MIME type validation and detection
    const detectedMimeType = await this._validateAndDetectMimeType(file, validationId);
    
    // Step 3: File signature validation (only blocks executables)
    await this._validateFileSignature(file, validationId);
    
    // Step 4: MIME/Category consistency check
    const mimeMismatch = this._checkMimeCategoryConsistency(detectedMimeType, fileInfo.category);
    
    // Step 5: Content security scanning
    const securityInfo = await this._performSecurityScan(file, fileInfo, validationId);
    
    // Step 6: Memory boundary check
    this._validateMemoryBoundaries(file);
    
    return {
      isValid: true,
      fileInfo: {
        ...fileInfo,
        detectedMimeType,
      },
      securityInfo: {
        ...securityInfo,
        mimeMismatch,
      },
    };
  }
  
  /**
   * Extract basic file information
   */
  private _extractFileInfo(file: File) {
    const extension = this._getFileExtension(file.name);
    const category = getCategoryFromExtension(extension);
    
    return {
      name: this._sanitizeFileName(file.name),
      originalName: file.name, // Keep original for path traversal checks
      size: file.size,
      type: file.type,
      extension,
      category,
    };
  }
  
  /**
   * Validate basic file properties
   */
  private async _validateBasicProperties(
    file: File, 
    fileInfo: ReturnType<typeof this._extractFileInfo>,
    validationId: string
  ): Promise<void> {
    // Check if validation was aborted
    if (this.abortedValidations.has(validationId)) {
      throw new FileValidationError(ValidationErrorType.TIMEOUT_EXCEEDED, 'Validation was aborted');
    }
    
    // Check file size
    const maxSize = fileInfo.category === 'UNKNOWN' 
      ? FILE_VALIDATION_CONFIG.MAX_FILE_SIZE.UNKNOWN
      : FILE_VALIDATION_CONFIG.MAX_FILE_SIZE[fileInfo.category] || FILE_VALIDATION_CONFIG.MAX_FILE_SIZE.DEFAULT;
    
    if (file.size > maxSize) {
      throw new FileValidationError(
        ValidationErrorType.FILE_TOO_LARGE,
        `File size (${this._formatFileSize(file.size)}) exceeds the maximum allowed size (${this._formatFileSize(maxSize)})`
      );
    }
    
    // Check if file is empty
    if (file.size === 0) {
      throw new FileValidationError(
        ValidationErrorType.FILE_CORRUPTED,
        'File appears to be empty or corrupted'
      );
    }
    
    // Validate extension for known categories
    if (fileInfo.category !== 'UNKNOWN') {
      const allowedExtensions = FILE_VALIDATION_CONFIG.ALLOWED_EXTENSIONS[fileInfo.category];
      if (!allowedExtensions.includes(fileInfo.extension.toLowerCase())) {
        throw new FileValidationError(
          ValidationErrorType.INVALID_FILE_TYPE,
          `File type "${fileInfo.extension}" is not supported for ${fileInfo.category} files`
        );
      }
    } else {
      throw new FileValidationError(
        ValidationErrorType.INVALID_FILE_TYPE,
        `File type "${fileInfo.extension}" is not supported`
      );
    }
  }
  
  /**
   * Validate and detect MIME type by reading file headers
   */
  private async _validateAndDetectMimeType(file: File, validationId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        // Check if validation was aborted
        if (this.abortedValidations.has(validationId)) {
          return reject(new FileValidationError(ValidationErrorType.TIMEOUT_EXCEEDED, 'Validation was aborted'));
        }
        
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer.slice(0, 512)); // Read first 512 bytes
          const detectedMimeType = this._detectMimeFromSignature(uint8Array);
          
          // Use detected MIME if available, otherwise fall back to declared
          const actualMimeType = detectedMimeType || file.type;
          
          // Log discrepancy for monitoring (but don't fail here)
          if (file.type && detectedMimeType && file.type !== detectedMimeType) {
            console.warn(`MIME type mismatch: declared=${file.type}, detected=${detectedMimeType}`);
          }
          
          resolve(actualMimeType);
        } catch (error) {
          reject(new FileValidationError(
            ValidationErrorType.FILE_CORRUPTED,
            'Unable to read file headers'
          ));
        }
      };
      
      reader.onerror = () => {
        reject(new FileValidationError(
          ValidationErrorType.FILE_CORRUPTED,
          'Failed to read file for validation'
        ));
      };
      
      // Read first few KB for MIME detection
      reader.readAsArrayBuffer(file.slice(0, 4096));
    });
  }
  
  /**
   * Validate file signature against known malicious patterns
   */
  private async _validateFileSignature(file: File, validationId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        // Check if validation was aborted
        if (this.abortedValidations.has(validationId)) {
          return reject(new FileValidationError(ValidationErrorType.TIMEOUT_EXCEEDED, 'Validation was aborted'));
        }
        
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          const headHex = Array.from(bytes.slice(0, 8))
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
          
          // Check for malicious signatures (only truly dangerous ones)
          for (const signature of FILE_VALIDATION_CONFIG.SECURITY_PATTERNS.MALICIOUS_SIGNATURES) {
            if (headHex.startsWith(signature)) {
              return reject(new FileValidationError(
                ValidationErrorType.SECURITY_THREAT,
                'Executable file content detected'
              ));
            }
          }
          
          resolve();
        } catch (error) {
          reject(new FileValidationError(
            ValidationErrorType.FILE_CORRUPTED,
            'Unable to validate file signature'
          ));
        }
      };
      
      reader.onerror = () => reject(new FileValidationError(
        ValidationErrorType.FILE_CORRUPTED,
        'Failed to read file signature'
      ));
      
      // Read first 64 bytes for signature validation
      reader.readAsArrayBuffer(file.slice(0, 64));
    });
  }
  
  /**
   * Check MIME type and category consistency
   */
  private _checkMimeCategoryConsistency(
    detectedMimeType: string, 
    category: keyof typeof FILE_VALIDATION_CONFIG.ALLOWED_MIME_TYPES | 'UNKNOWN'
  ): boolean {
    if (category === 'UNKNOWN') return false;
    
    if (detectedMimeType && !isMimeAllowedForCategory(detectedMimeType, category)) {
      // For now, just mark as mismatch but don't fail
      // Future: could escalate to server validation or fail validation
      return true;
    }
    
    return false;
  }
  
  /**
   * Perform security content scanning
   */
  private async _performSecurityScan(
    file: File, 
    fileInfo: ReturnType<typeof this._extractFileInfo>,
    validationId: string
  ): Promise<Pick<ValidationResult['securityInfo'], 'riskLevel' | 'detectedThreats' | 'requiresServerValidation'>> {
    const detectedThreats: string[] = [];
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let requiresServerValidation = false;
    
    // Check if validation was aborted
    if (this.abortedValidations.has(validationId)) {
      throw new FileValidationError(ValidationErrorType.TIMEOUT_EXCEEDED, 'Validation was aborted');
    }
    
    // For PDF files, perform additional JavaScript detection
    if (fileInfo.category === 'PDF') {
      const hasJS = await this._scanPDFForJavaScript(file, validationId);
      if (hasJS) {
        detectedThreats.push('JavaScript content detected');
        riskLevel = 'MEDIUM';
        requiresServerValidation = true;
      }
    }
    
    // Check ORIGINAL filename for path traversal attempts (before sanitization)
    const hasPathTraversal = FILE_VALIDATION_CONFIG.SECURITY_PATTERNS.PATH_TRAVERSAL
      .some(pattern => pattern.test(fileInfo.originalName));
    
    if (hasPathTraversal) {
      detectedThreats.push('Path traversal attempt detected');
      riskLevel = 'HIGH';
    }
    
    // Large files require server-side validation
    if (file.size > FILE_VALIDATION_CONFIG.MEMORY_LIMITS.CLIENT_PROCESSING) {
      requiresServerValidation = true;
      if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
    }
    
    return {
      riskLevel,
      detectedThreats,
      requiresServerValidation,
    };
  }
  
  /**
   * Validate memory boundaries for client-side processing
   */
  private _validateMemoryBoundaries(file: File): void {
    if (file.size > FILE_VALIDATION_CONFIG.MEMORY_LIMITS.CLIENT_PROCESSING) {
      // This is not an error, just requires server processing
      console.info(`File ${file.name} (${this._formatFileSize(file.size)}) will be processed server-side`);
    }
  }
  
  /**
   * Detect MIME type from file signature (improved WebP detection)
   */
  private _detectMimeFromSignature(bytes: Uint8Array): string | null {
    // Helper to check signature at offset
    const matchesSignature = (signature: number[], offset = 0): boolean => {
      if (bytes.length < offset + signature.length) return false;
      return signature.every((byte, index) => bytes[offset + index] === byte);
    };
    
    // PDF signature
    if (matchesSignature([0x25, 0x50, 0x44, 0x46])) return 'application/pdf'; // %PDF
    
    // Image signatures
    if (matchesSignature([0xFF, 0xD8, 0xFF])) return 'image/jpeg';
    if (matchesSignature([0x89, 0x50, 0x4E, 0x47])) return 'image/png';
    if (matchesSignature([0x47, 0x49, 0x46])) return 'image/gif';
    
    // WebP: RIFF....WEBP (improved detection)
    if (matchesSignature([0x52, 0x49, 0x46, 0x46]) && 
        bytes.length >= 12 && 
        matchesSignature([0x57, 0x45, 0x42, 0x50], 8)) {
      return 'image/webp';
    }
    
    // ZIP-based documents (DOCX, XLSX, etc.)
    if (matchesSignature([0x50, 0x4B, 0x03, 0x04])) {
      // This is a ZIP file - could be Office document
      // For now, return generic application/zip and let category validation handle it
      return 'application/zip';
    }
    
    return null;
  }
  
  /**
   * Scan PDF for JavaScript content (improved coverage)
   */
  private async _scanPDFForJavaScript(file: File, validationId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        // Check if validation was aborted
        if (this.abortedValidations.has(validationId)) {
          return resolve(false);
        }
        
        try {
          const content = reader.result as string;
          const hasJS = FILE_VALIDATION_CONFIG.SECURITY_PATTERNS.JS_PATTERNS
            .some(pattern => pattern.test(content));
          resolve(hasJS);
        } catch {
          resolve(false); // Assume safe if can't scan
        }
      };
      
      reader.onerror = () => resolve(false);
      
      // Read larger portion for better coverage (first 50KB)
      // Note: This is still a pre-scan. Server should do full validation for suspicious files
      const scanSize = Math.min(file.size, 50 * 1024);
      reader.readAsText(file.slice(0, scanSize));
    });
  }
  
  /**
   * Create timeout promise for validation with abort capability
   */
  private _createTimeoutPromise(validationId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        this.abortedValidations.add(validationId);
        reject(new FileValidationError(
          ValidationErrorType.TIMEOUT_EXCEEDED,
          'File validation timed out'
        ));
      }, FILE_VALIDATION_CONFIG.MEMORY_LIMITS.TIMEOUT_MS);
    });
  }
  
  /**
   * Get file extension from filename
   */
  private _getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot).toLowerCase();
  }
  
  /**
   * Sanitize filename to prevent security issues
   */
  private _sanitizeFileName(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Replace invalid chars
      .replace(/^\.+/, '') // Remove leading dots
      .substring(0, 255); // Limit length
  }
  
  /**
   * Format file size for user display
   */
  private _formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Utility functions for easy integration
 */
export const FileValidationUtils = {
  /**
   * Quick validation for upload components
   */
  async quickValidate(file: File): Promise<boolean> {
    try {
      const validator = FileValidator.getInstance();
      const result = await validator.validateFile(file);
      return result.isValid;
    } catch {
      return false;
    }
  },
  
  /**
   * Get validation error message for UI display
   */
  getErrorMessage(error: unknown): string {
    if (error instanceof FileValidationError) {
      return error.getUserFriendlyMessage();
    }
    return 'An unexpected error occurred during file validation.';
  },
  
  /**
   * Check if file needs server-side processing
   */
  needsServerProcessing(file: File): boolean {
    return file.size > FILE_VALIDATION_CONFIG.MEMORY_LIMITS.CLIENT_PROCESSING;
  },
  
  /**
   * Get maximum allowed file size for extension (fixed private access)
   */
  getMaxFileSize(fileExtension: string): number {
    const category = getCategoryFromExtension(fileExtension);
    if (category === 'UNKNOWN') return FILE_VALIDATION_CONFIG.MAX_FILE_SIZE.UNKNOWN;
    return FILE_VALIDATION_CONFIG.MAX_FILE_SIZE[category] || FILE_VALIDATION_CONFIG.MAX_FILE_SIZE.DEFAULT;
  },
  
  /**
   * Check if a file extension is supported
   */
  isExtensionSupported(extension: string): boolean {
    return getCategoryFromExtension(extension) !== 'UNKNOWN';
  },
  
  /**
   * Get supported extensions for a category
   */
  getSupportedExtensions(category?: keyof typeof FILE_VALIDATION_CONFIG.ALLOWED_MIME_TYPES): string[] {
    if (!category) {
      // Return all supported extensions
      return Object.values(FILE_VALIDATION_CONFIG.ALLOWED_EXTENSIONS).flat();
    }
    return FILE_VALIDATION_CONFIG.ALLOWED_EXTENSIONS[category] || [];
  },
};

// Export singleton instance for global use
export const fileValidator = FileValidator.getInstance();