// src/hooks/useFileProcessor.ts
// Production-ready PDF file processing hook with proper error handling and type safety

import { useState, useRef, useCallback, useEffect } from 'react';

// Type definitions
export type Operation = 'merge' | 'split' | 'rotate' | 'compress' | 'protect' | 'jpgToPdf' | 'pdfToJpg';

export interface ProcessingOptions {
  // Split options
  splitPageRanges?: string; // e.g., "1-3,5,7-9"
  
  // Rotate options
  rotationDegrees?: 90 | 180 | 270;
  rotationPages?: number[]; // specific pages to rotate, empty = all
  
  // Compression options
  compressionQuality?: number; // 0.1 to 1.0
  
  // Protection options
  password?: string;
  permissions?: {
    printing?: boolean;
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
  };
  
  // Image conversion options
  imageQuality?: number; // 0.1 to 1.0
  outputFormat?: 'jpeg' | 'png';
}

export interface WorkerMessage {
  id: string;
  type: Operation;
  files: ArrayBuffer[];
  options?: {
    pageRanges?: string;
    rotation?: 90 | 180 | 270;
    pages?: number[];
    quality?: number;
    password?: string;
    permissions?: {
      printing?: boolean;
      modifying?: boolean;
      copying?: boolean;
      annotating?: boolean;
    };
    imageQuality?: number;
    outputFormat?: 'jpeg' | 'png';
  };
}

export interface WorkerResponse {
  id: string;
  success: boolean;
  result?: ArrayBuffer | ArrayBuffer[];
  error?: string;
  progress?: number;
}

// Result types based on operation
type ProcessingResultByOp = {
  merge: File[];
  split: File[];
  rotate: File[];
  compress: File[];
  protect: File[];
  jpgToPdf: File[];
  pdfToJpg: File[]; // images
};

export type ProcessingResult<T extends Operation> = ProcessingResultByOp[T];

// Processing state
export interface ProcessingState {
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  results: File[] | null;
  error: string | null;
  estimatedTimeRemaining: number | null;
  startTime: number | null;
}

// Job resolver interface
interface JobResolver {
  resolve: (files: File[]) => void;
  reject: (error: Error) => void;
  operation: Operation;
  options: ProcessingOptions;
  startTime: number;
}

// File validation result
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Constants
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILES_PER_OPERATION = 20;
const CLIENT_SIDE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB for client-side processing

export function useFileProcessor() {
  // State management
  const [state, setState] = useState<ProcessingState>({
    status: 'idle',
    progress: 0,
    message: '',
    results: null,
    error: null,
    estimatedTimeRemaining: null,
    startTime: null
  });

  // Refs for persistent data
  const workerRef = useRef<Worker | null>(null);
  const jobsRef = useRef<Map<string, JobResolver>>(new Map());
  const currentJobIdRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Computed properties
  const isProcessing = state.status === 'processing';
  const isCompleted = state.status === 'completed';
  const isError = state.status === 'error';
  const isIdle = state.status === 'idle';

  // Generate unique job ID
  const generateJobId = useCallback((): string => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Create worker with proper event handling
  const createWorker = useCallback((): Worker => {
    if (typeof Worker === 'undefined') {
      throw new Error('Web Workers are not supported in this environment');
    }

    const worker = new Worker(
      new URL('../workers/pdfWorker.ts', import.meta.url), 
      { type: 'module' }
    );

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, success, result, error, progress } = event.data;
      
      // Ignore messages from old jobs
      if (id !== currentJobIdRef.current) return;

      const job = jobsRef.current.get(id);
      if (!job) return;

      // Handle progress updates
      if (success && typeof progress === 'number' && progress < 100) {
        const elapsed = Date.now() - job.startTime;
        const estimatedTotal = elapsed / (progress / 100);
        const estimatedRemaining = estimatedTotal - elapsed;

        setState(prev => ({
          ...prev,
          progress,
          message: `🔄 Processing... ${Math.round(progress)}%`,
          estimatedTimeRemaining: estimatedRemaining > 0 ? estimatedRemaining : null
        }));
        return;
      }

      // Handle completion
      if (success && result) {
        try {
          const files = Array.isArray(result)
            ? result.map((buffer, i) => arrayBufferToFile(
                buffer, 
                inferFileName(job.operation, i, job.options),
                inferMimeType(job.operation)
              ))
            : [arrayBufferToFile(
                result, 
                inferFileName(job.operation, 0, job.options),
                inferMimeType(job.operation)
              )];

          setState(prev => ({
            ...prev,
            status: 'completed',
            progress: 100,
            message: `✅ Processing completed! ${files.length} file${files.length > 1 ? 's' : ''} ready for download.`,
            results: files,
            estimatedTimeRemaining: null
          }));

          job.resolve(files);
        } catch (conversionError) {
          const err = new Error(`Failed to convert result: ${conversionError}`);
          setState(prev => ({
            ...prev,
            status: 'error',
            progress: 0,
            message: `❌ Error: ${err.message}`,
            error: err.message,
            estimatedTimeRemaining: null
          }));
          job.reject(err);
        }
      } else {
        // Handle error
        const err = new Error(error ?? 'Processing failed');
        setState(prev => ({
          ...prev,
          status: 'error',
          progress: 0,
          message: `❌ Error: ${err.message}`,
          error: err.message,
          estimatedTimeRemaining: null
        }));
        job.reject(err);
      }

      // Cleanup job
      jobsRef.current.delete(id);
    };

    worker.onerror = (event: ErrorEvent) => {
      const err = new Error(event.message || 'Worker error occurred');
      const currentJob = jobsRef.current.get(currentJobIdRef.current);
      
      setState(prev => ({
        ...prev,
        status: 'error',
        message: '❌ Worker error occurred',
        error: err.message,
        estimatedTimeRemaining: null
      }));

      if (currentJob) {
        currentJob.reject(err);
        jobsRef.current.delete(currentJobIdRef.current);
      }
    };

    return worker;
  }, []);

  // Initialize worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        workerRef.current = createWorker();
      } catch (error) {
        console.warn('Failed to create Web Worker:', error);
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [createWorker]);

  // File validation
  const validateFiles = useCallback((
    operation: Operation,
    files: File[],
    options: ProcessingOptions = {}
  ): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if files provided
    if (!files || files.length === 0) {
      errors.push('No files provided');
      return { valid: false, errors, warnings };
    }

    // Check file count limits
    if (files.length > MAX_FILES_PER_OPERATION) {
      errors.push(`Too many files. Maximum ${MAX_FILES_PER_OPERATION} files allowed`);
    }

    // Operation-specific validation
    const singleFileOps: Operation[] = ['split', 'rotate', 'compress', 'protect', 'pdfToJpg'];
    if (singleFileOps.includes(operation) && files.length > 1) {
      errors.push(`${operation} operation accepts only one file`);
    }

    // File type validation
    for (const file of files) {
      if (operation === 'jpgToPdf') {
        if (!file.type.startsWith('image/')) {
          errors.push(`${file.name}: Expected image file, got ${file.type || 'unknown'}`);
        }
      } else {
        if (file.type !== 'application/pdf') {
          errors.push(`${file.name}: Expected PDF file, got ${file.type || 'unknown'}`);
        }
      }

      // Size validation
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (${formatFileSize(file.size)}). Maximum ${formatFileSize(MAX_FILE_SIZE)}`);
      }

      // Client-side processing warning
      if (file.size > CLIENT_SIDE_SIZE_LIMIT) {
        warnings.push(`${file.name}: Large file will be processed on server for better performance`);
      }
    }

    // Operation-specific option validation
    if (operation === 'protect' && !options.password) {
      errors.push('Password is required for protect operation');
    }

    if (operation === 'split' && !options.splitPageRanges) {
      errors.push('Page ranges are required for split operation');
    }

    if (operation === 'rotate' && !options.rotationDegrees) {
      warnings.push('No rotation angle specified, defaulting to 90 degrees');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  // Convert ArrayBuffer to File with proper MIME type
  const arrayBufferToFile = useCallback((
    buffer: ArrayBuffer,
    fileName: string,
    mimeType: string
  ): File => {
    return new File([new Blob([buffer], { type: mimeType })], fileName, { type: mimeType });
  }, []);

  // Infer output filename based on operation
  const inferFileName = useCallback((
    operation: Operation,
    index: number,
    options: ProcessingOptions
  ): string => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    
    switch (operation) {
      case 'merge':
        return `merged-${timestamp}.pdf`;
      case 'split':
        return `page-${index + 1}-${timestamp}.pdf`;
      case 'rotate':
        return `rotated-${options.rotationDegrees || 90}deg-${timestamp}.pdf`;
      case 'compress':
        return `compressed-${timestamp}.pdf`;
      case 'protect':
        return `protected-${timestamp}.pdf`;
      case 'jpgToPdf':
        return `images-to-pdf-${timestamp}.pdf`;
      case 'pdfToJpg':
        const ext = options.outputFormat === 'png' ? 'png' : 'jpg';
        return `page-${index + 1}-${timestamp}.${ext}`;
      default:
        return `output-${index + 1}-${timestamp}.pdf`;
    }
  }, []);

  // Infer MIME type based on operation
  const inferMimeType = useCallback((operation: Operation): string => {
    if (operation === 'pdfToJpg') {
      return 'image/jpeg'; // Default to JPEG, could be enhanced to check options
    }
    return 'application/pdf';
  }, []);

  // Client-side processing
  const processClientSide = useCallback(async (
    operation: Operation,
    files: File[],
    options: ProcessingOptions
  ): Promise<File[]> => {
    if (!workerRef.current) {
      throw new Error('Web Worker not available');
    }

    const fileBuffers = await Promise.all(
      files.map(file => file.arrayBuffer())
    );

    const jobId = generateJobId();
    currentJobIdRef.current = jobId;

    const message: WorkerMessage = {
      id: jobId,
      type: operation,
      files: fileBuffers,
      options: {
        pageRanges: options.splitPageRanges,
        rotation: options.rotationDegrees,
        pages: options.rotationPages,
        quality: options.compressionQuality,
        password: options.password,
        permissions: options.permissions,
        imageQuality: options.imageQuality,
        outputFormat: options.outputFormat
      }
    };

    return new Promise<File[]>((resolve, reject) => {
      jobsRef.current.set(jobId, {
        resolve,
        reject,
        operation,
        options,
        startTime: Date.now()
      });

      setState(prev => ({
        ...prev,
        status: 'processing',
        progress: 0,
        message: '🔄 Starting processing...',
        results: null,
        error: null,
        startTime: Date.now(),
        estimatedTimeRemaining: null
      }));

      workerRef.current!.postMessage(message);
    });
  }, [generateJobId]);

  // Server-side processing (placeholder for future implementation)
  const processServerSide = useCallback(async (
    operation: Operation,
    files: File[],
    options: ProcessingOptions
  ): Promise<File[]> => {
    // This would implement server-side processing via API
    throw new Error('Server-side processing not yet implemented');
  }, []);

  // Main processing function
  const processFiles = useCallback(async <T extends Operation>(
    operation: T,
    files: File[],
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult<T>> => {
    // Validation
    const validation = validateFiles(operation, files, options);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Show warnings
    validation.warnings.forEach(warning => {
      console.warn('Processing warning:', warning);
    });

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Determine processing method
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const useClientSide = totalSize <= CLIENT_SIDE_SIZE_LIMIT && workerRef.current;

      let result: File[];
      
      if (useClientSide) {
        result = await processClientSide(operation, files, options);
      } else {
        result = await processServerSide(operation, files, options);
      }

      return result as ProcessingResult<T>;
    } catch (error) {
      // Clean up on error
      if (currentJobIdRef.current) {
        jobsRef.current.delete(currentJobIdRef.current);
      }
      
      setState(prev => ({
        ...prev,
        status: 'error',
        message: `❌ Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        estimatedTimeRemaining: null
      }));
      
      throw error;
    } finally {
      abortControllerRef.current = null;
    }
  }, [validateFiles, processClientSide, processServerSide]);

  // Cancel processing
  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (currentJobIdRef.current) {
      const job = jobsRef.current.get(currentJobIdRef.current);
      if (job) {
        job.reject(new Error('Processing cancelled by user'));
        jobsRef.current.delete(currentJobIdRef.current);
      }
    }

    setState(prev => ({
      ...prev,
      status: 'idle',
      progress: 0,
      message: '❌ Processing cancelled',
      error: 'Cancelled by user',
      estimatedTimeRemaining: null
    }));
  }, []);

  // Reset state
  const reset = useCallback(() => {
    // Cancel any ongoing processing
    if (isProcessing) {
      cancelProcessing();
    }

    // Clear all jobs
    jobsRef.current.clear();
    currentJobIdRef.current = '';

    setState({
      status: 'idle',
      progress: 0,
      message: '',
      results: null,
      error: null,
      estimatedTimeRemaining: null,
      startTime: null
    });
  }, [isProcessing, cancelProcessing]);

  return {
    // State
    state,
    isProcessing,
    isCompleted,
    isError,
    isIdle,
    
    // Actions
    processFiles,
    cancelProcessing,
    reset,
    validateFiles,
    
    // Utilities
    formatFileSize
  };
}

// Utility function to format file sizes
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}