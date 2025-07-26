// src/components/UploadZone.tsx
// Comprehensive drag-and-drop file upload component with accessibility and mobile support

import React, { useCallback, useState, useRef, useId, useEffect } from 'react';

// === TYPES ===
export interface UploadZoneProps {
  /** Type of operation this upload zone is for */
  operation: 'merge' | 'split' | 'rotate' | 'compress' | 'protect' | 'jpgToPdf' | 'pdfToJpg';
  
  /** Accepted file types (e.g., ".pdf", "image/*", ".pdf,.jpg,.png") */
  acceptedTypes: string;
  
  /** Maximum number of files allowed */
  maxFiles?: number;
  
  /** Maximum size per file in bytes */
  maxSizePerFile?: number;
  
  /** Allow multiple file selection */
  multiple?: boolean;
  
  /** Callback when files are successfully selected and validated */
  onFilesSelected?: (files: File[]) => void;
  
  /** Callback when validation errors occur */
  onError?: (error: string) => void;
  
  /** Current processing state */
  isProcessing?: boolean;
  
  /** Processing progress (0-100) */
  progress?: number;
  
  /** Processing status message */
  statusMessage?: string;
  
  /** Whether processing completed successfully */
  isCompleted?: boolean;
  
  /** Error message if processing failed */
  errorMessage?: string;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Custom content to display in upload zone */
  children?: React.ReactNode;
  
  /** Disable the upload zone */
  disabled?: boolean;
  
  /** Test ID for testing */
  testId?: string;
}

interface FileValidationResult {
  valid: boolean;
  errors: string[];
}

// === UTILITY FUNCTIONS ===
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  // Clamp to available sizes to handle very large files
  const sizeIndex = Math.min(i, sizes.length - 1);
  
  return parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(2)) + ' ' + sizes[sizeIndex];
};

const validateFileType = (file: File, acceptedTypes: string): boolean => {
  if (!acceptedTypes) return true;
  
  const types = acceptedTypes.split(',').map(type => type.trim().toLowerCase());
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  
  return types.some(type => {
    if (type.startsWith('.')) {
      // Extension check
      return fileName.endsWith(type);
    } else if (type.includes('/*')) {
      // MIME type wildcard (e.g., "image/*")
      const baseType = type.split('/')[0];
      return fileType.startsWith(baseType + '/');
    } else {
      // Exact MIME type
      return fileType === type;
    }
  });
};

const getExpectedFileDescription = (acceptedTypes: string): string => {
  if (acceptedTypes.includes('.pdf')) return 'PDF';
  if (acceptedTypes.includes('image/*')) return 'image';
  if (acceptedTypes.includes('.jpg') || acceptedTypes.includes('.jpeg')) return 'JPG/JPEG';
  if (acceptedTypes.includes('.png')) return 'PNG';
  return 'supported';
};

// === MAIN COMPONENT ===
export default function UploadZone({
  operation,
  acceptedTypes,
  maxFiles = 10,
  maxSizePerFile = 100 * 1024 * 1024, // 100MB default
  multiple = false,
  onFilesSelected,
  onError,
  isProcessing = false,
  progress = 0,
  statusMessage = '',
  isCompleted = false,
  errorMessage = '',
  className = '',
  children,
  disabled = false,
  testId = 'upload-zone'
}: UploadZoneProps) {
  // === STATE ===
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // === REFS ===
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // === IDS FOR ACCESSIBILITY ===
  const uploadZoneId = useId();
  const fileInputId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const statusId = useId();

  // === COMPUTED VALUES ===
  const hasError = !!errorMessage || validationErrors.length > 0;
  const isDisabled = disabled || isProcessing;
  const expectedFileType = getExpectedFileDescription(acceptedTypes);
  
  // Build aria-describedby safely
  const describedBy = [
    descriptionId,
    hasError ? errorId : undefined,
    (isProcessing || statusMessage) ? statusId : undefined
  ].filter(Boolean).join(' ');

  // === FILE VALIDATION ===
  const validateFiles = useCallback((files: File[]): FileValidationResult => {
    const errors: string[] = [];

    // Check file count
    if (!multiple && files.length > 1) {
      errors.push('Please select only one file for this operation');
    }

    if (files.length > maxFiles) {
      errors.push(`Please select no more than ${maxFiles} file${maxFiles === 1 ? '' : 's'}`);
    }

    // Check each file
    files.forEach((file) => {
      // File size validation
      if (file.size > maxSizePerFile) {
        errors.push(`File "${file.name}" is too large. Maximum size: ${formatFileSize(maxSizePerFile)}`);
      }

      // File type validation
      if (!validateFileType(file, acceptedTypes)) {
        errors.push(`File "${file.name}" is not a valid ${expectedFileType} file`);
      }

      // Empty file check
      if (file.size === 0) {
        errors.push(`File "${file.name}" appears to be empty`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }, [acceptedTypes, maxFiles, maxSizePerFile, multiple, expectedFileType]);

  // === FILE HANDLING ===
  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    
    if (files.length === 0) return;

    setIsValidating(true);
    setValidationErrors([]);

    // Small delay to show validation state
    await new Promise(resolve => setTimeout(resolve, 100));

    const validation = validateFiles(files);
    
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      setIsValidating(false);
      onError?.(validation.errors.join('. '));
      return;
    }

    setSelectedFiles(files);
    setValidationErrors([]);
    setIsValidating(false);
    onFilesSelected?.(files);
  }, [validateFiles, onFilesSelected, onError]);

  // === DRAG AND DROP HANDLERS ===
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current++;
    
    if (dragCounterRef.current === 1 && !isDisabled) {
      setIsDragOver(true);
    }
  }, [isDisabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current--;
    
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Set the correct drop effect
    if (!isDisabled) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, [isDisabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current = 0;
    setIsDragOver(false);
    
    if (isDisabled) return;

    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [isDisabled, handleFiles]);

  // === FILE INPUT HANDLERS ===
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const triggerFileInput = useCallback(() => {
    if (!isDisabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [isDisabled]);

  // === KEYBOARD HANDLERS ===
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Prevent nested handler double-fires
    if (e.currentTarget !== e.target) return;
    
    if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
      e.preventDefault();
      triggerFileInput();
    }
  }, [isDisabled, triggerFileInput]);

  // === CLEAR FILES ===
  const clearFiles = useCallback(() => {
    setSelectedFiles([]);
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // === RETRY HANDLER ===
  const handleRetry = useCallback(() => {
    setValidationErrors([]);
    if (selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    } else {
      triggerFileInput();
    }
  }, [selectedFiles, handleFiles, triggerFileInput]);

  // === RESET DRAG COUNTER ON MOUNT ===
  useEffect(() => {
    dragCounterRef.current = 0;
  }, []);

  // === COMPUTE CLASSES ===
  const getZoneClasses = () => {
    const baseClasses = [
      'relative',
      'min-h-[200px]',
      'border-2',
      'border-dashed',
      'rounded-xl',
      'p-6',
      'sm:p-8',
      'text-center',
      'transition-all',
      'duration-200',
      'focus-within:outline-none'
    ];

    // State-dependent classes
    if (isDisabled) {
      baseClasses.push(
        'cursor-not-allowed',
        'opacity-60',
        'border-gray-200',
        'dark:border-gray-700',
        'bg-gray-50',
        'dark:bg-gray-800'
      );
    } else if (hasError) {
      baseClasses.push(
        'border-red-300',
        'dark:border-red-600',
        'bg-red-50',
        'dark:bg-red-900/20',
        'cursor-pointer'
      );
    } else if (isCompleted) {
      baseClasses.push(
        'border-green-300',
        'dark:border-green-600',
        'bg-green-50',
        'dark:bg-green-900/20',
        'cursor-default'
      );
    } else if (isProcessing || isValidating) {
      baseClasses.push(
        'border-blue-300',
        'dark:border-blue-600',
        'bg-blue-50',
        'dark:bg-blue-900/20',
        'cursor-default'
      );
    } else if (isDragOver) {
      baseClasses.push(
        'border-blue-400',
        'dark:border-blue-500',
        'bg-blue-100',
        'dark:bg-blue-800/30',
        'cursor-copy'
      );
    } else {
      baseClasses.push(
        'border-gray-300',
        'dark:border-gray-600',
        'bg-white',
        'dark:bg-gray-800',
        'hover:border-gray-400',
        'dark:hover:border-gray-500',
        'hover:bg-gray-50',
        'dark:hover:bg-gray-700',
        'cursor-pointer'
      );
    }

    return baseClasses.join(' ');
  };

  // === RENDER ICON ===
  const renderIcon = () => {
    if (isCompleted) {
      return (
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    }

    if (isProcessing || isValidating) {
      return (
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" role="status" aria-label="Processing"></div>
        </div>
      );
    }

    return (
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
    );
  };

  // === RENDER MESSAGE ===
  const renderMessage = () => {
    if (hasError) {
      const allErrors = [...validationErrors];
      if (errorMessage) allErrors.unshift(errorMessage);
      
      return (
        <div className="space-y-2">
          <p className="text-lg font-medium text-red-700 dark:text-red-300">
            Upload Failed
          </p>
          <div className="text-sm text-red-600 dark:text-red-400 space-y-1">
            {allErrors.map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        </div>
      );
    }

    if (isCompleted) {
      return (
        <p className="text-lg font-medium text-green-700 dark:text-green-300">
          {statusMessage || 'Processing completed successfully!'}
        </p>
      );
    }

    if (isProcessing) {
      return (
        <div className="space-y-3">
          <p className="text-lg font-medium text-blue-700 dark:text-blue-300">
            {statusMessage || 'Processing your files...'}
          </p>
          {progress >= 0 && (
            <div className="w-full max-w-md mx-auto">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Processing progress: ${progress}%`}
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {progress}% complete
              </p>
            </div>
          )}
        </div>
      );
    }

    if (isValidating) {
      return (
        <p className="text-lg font-medium text-blue-700 dark:text-blue-300">
          Validating files...
        </p>
      );
    }

    // Default upload message
    const multipleText = multiple ? ` (up to ${maxFiles} files)` : '';
    return (
      <div className="space-y-3">
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          📁 Drop {expectedFileType} file{multiple ? 's' : ''} here or click to browse{multipleText}
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <p>Maximum file size: {formatFileSize(maxSizePerFile)}</p>
          {multiple && <p>Select up to {maxFiles} files</p>}
          <p className="flex items-center justify-center gap-1">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Files auto-deleted after 1 hour
          </p>
        </div>
      </div>
    );
  };

  // === RENDER SELECTED FILES ===
  const renderSelectedFiles = () => {
    if (selectedFiles.length === 0 || isProcessing) return null;

    return (
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Selected files ({selectedFiles.length}):
          </h4>
          <button
            onClick={clearFiles}
            className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
            type="button"
          >
            Clear all
          </button>
        </div>
        
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {selectedFiles.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-6 h-6 bg-primary-100 dark:bg-primary-900 rounded flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-700 dark:text-gray-300 truncate" title={file.name}>
                  {file.name}
                </span>
              </div>
              <span className="text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                {formatFileSize(file.size)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // === RENDER ACTION BUTTONS ===
  const renderActionButtons = () => {
    if (isProcessing || isValidating) return null;

    if (hasError) {
      return (
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRetry}
            className="btn btn-primary"
            type="button"
          >
            🔄 Try Again
          </button>
          <button
            onClick={clearFiles}
            className="btn btn-secondary"
            type="button"
          >
            📁 Select Different Files
          </button>
        </div>
      );
    }

    if (isCompleted) {
      return (
        <div className="mt-6 flex justify-center">
          <button
            onClick={clearFiles}
            className="btn btn-primary"
            type="button"
          >
            📁 Process More Files
          </button>
        </div>
      );
    }

    return null;
  };

  // === MAIN RENDER ===
  return (
    <div className={`relative ${className}`} data-testid={testId}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        id={fileInputId}
        type="file"
        accept={acceptedTypes}
        multiple={multiple}
        onChange={handleFileInputChange}
        disabled={isDisabled}
        className="sr-only"
        aria-describedby={describedBy}
      />

      {/* Main upload zone */}
      <div
        id={uploadZoneId}
        className={getZoneClasses()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={!isDisabled ? triggerFileInput : undefined}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-label={`Upload ${expectedFileType} files for ${operation}`}
        aria-describedby={describedBy}
        aria-disabled={isDisabled}
        aria-busy={isProcessing || isValidating}
      >
        {/* Content */}
        <div className="space-y-4">
          {renderIcon()}
          
          <div 
            id={statusId}
            role="status" 
            aria-live="polite"
            aria-atomic="true"
          >
            {renderMessage()}
          </div>

          {children && (
            <div className="mt-6">
              {children}
            </div>
          )}
        </div>

        {/* Processing overlay for better UX */}
        {isProcessing && (
          <div 
            className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 rounded-xl flex items-center justify-center z-10"
            aria-hidden="true"
          >
            <div className="text-center space-y-4">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {statusMessage || 'Processing...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Selected files display */}
      {renderSelectedFiles()}

      {/* Action buttons */}
      {renderActionButtons()}

      {/* Error messages for screen readers */}
      {hasError && (
        <div id={errorId} role="alert" className="sr-only">
          {validationErrors.join('. ')}
          {errorMessage && `. ${errorMessage}`}
        </div>
      )}

      {/* Description for screen readers */}
      <div id={descriptionId} className="sr-only">
        Upload {expectedFileType} files to {operation}. 
        {multiple ? `You can select up to ${maxFiles} files.` : 'Select one file only.'}
        Maximum file size is {formatFileSize(maxSizePerFile)}.
        You can drag and drop files or click to browse.
        Files are automatically deleted after 1 hour for your privacy.
      </div>
    </div>
  );
}