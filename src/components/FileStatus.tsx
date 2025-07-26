// src/components/FileStatus.tsx
// Production-ready file status component with countdown, download states, and actions
// FIXED: Prop-reactive timers, safer intervals, accessibility improvements, and performance optimizations

import React, { useEffect, useState, useCallback, useRef, useId, memo, useMemo } from 'react';

// === TYPES ===
export type FileStatusState = 'processing' | 'completed' | 'error' | 'expired' | 'downloading';

export interface ProcessedFile {
  id: string;
  name: string;
  originalName?: string;
  size: number;
  blob?: Blob;
  url?: string;
  downloadUrl?: string;
  processingTime?: number; // in ms
  operation?: string;
}

export interface FileStatusProps {
  /** Processed file data */
  file: ProcessedFile;
  
  /** Current status of the file */
  status: FileStatusState;
  
  /** Time remaining until auto-deletion (in seconds) */
  timeRemaining?: number;
  
  /** Whether the file is ready for download */
  downloadReady?: boolean;
  
  /** Whether download is in progress */
  downloading?: boolean;
  
  /** Error message if status is 'error' */
  errorMessage?: string;
  
  /** Callback when download is initiated */
  onDownload?: (file: ProcessedFile) => void;
  
  /** Callback when file is cleared/removed */
  onClear?: (fileId: string) => void;
  
  /** Callback when undo is requested (if recently processed) */
  onUndo?: (fileId: string) => void;
  
  /** Whether to show undo option (for recently processed files) */
  showUndo?: boolean;
  
  /** Time limit for undo action (in seconds) */
  undoTimeLimit?: number;
  
  /** Custom action buttons */
  customActions?: Array<{
    label: string;
    onClick: (file: ProcessedFile) => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    icon?: React.ReactNode;
  }>;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Test ID for testing */
  testId?: string;
}

// === UTILITY FUNCTIONS ===
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatTime = (seconds: number): string => {
  if (seconds <= 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

const formatProcessingTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

// === COUNTDOWN TIMER HOOK ===
const useCountdown = (initialTime: number, onExpire?: () => void) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isActive, setIsActive] = useState(true);
  const intervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null);

  const start = useCallback(() => {
    setIsActive(true);
  }, []);

  const pause = useCallback(() => {
    setIsActive(false);
  }, []);

  const reset = useCallback((newTime?: number) => {
    setTimeLeft(newTime ?? initialTime);
    setIsActive(true);
  }, [initialTime]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsActive(false);
            onExpire?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeLeft, onExpire]);

  return { timeLeft, isActive, start, pause, reset };
};

// === INDIVIDUAL FILE STATUS COMPONENT ===
const FileStatusCard = memo<FileStatusProps>(({
  file,
  status,
  timeRemaining = 3600, // Default 1 hour
  downloadReady = false,
  downloading = false,
  errorMessage,
  onDownload,
  onClear,
  onUndo,
  showUndo = false,
  undoTimeLimit = 30,
  customActions = [],
  className = '',
  testId = 'file-status'
}) => {
  // === STATE ===
  const [isExpanded, setIsExpanded] = useState(false);
  const [undoTimeLeft, setUndoTimeLeft] = useState(showUndo ? undoTimeLimit : 0);
  const [isExpiredLocally, setIsExpiredLocally] = useState(false);

  // === IDS FOR ACCESSIBILITY ===
  const cardId = useId();
  const titleId = useId();
  const statusId = useId();
  const actionsId = useId();

  // === COUNTDOWN TIMERS ===
  const deletionTimer = useCountdown(
    timeRemaining, 
    () => setIsExpiredLocally(true) // Set local expired state instead of immediate removal
  );

  // Only create undo timer if needed
  const undoTimer = useCountdown(
    showUndo ? undoTimeLimit : 0,
    () => setUndoTimeLeft(0)
  );

  // React to prop changes for timers
  useEffect(() => {
    deletionTimer.reset(timeRemaining);
  }, [timeRemaining, deletionTimer.reset]);

  useEffect(() => {
    if (showUndo) {
      undoTimer.reset(undoTimeLimit);
    }
  }, [showUndo, undoTimeLimit, undoTimer.reset]);

  // Handle local expiration
  useEffect(() => {
    if (isExpiredLocally) {
      // Small delay to show "expired" state before calling onClear
      const timeout = setTimeout(() => {
        onClear?.(file.id);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isExpiredLocally, onClear, file.id]);

  // Update undo time display
  useEffect(() => {
    if (showUndo) {
      setUndoTimeLeft(undoTimer.timeLeft);
    }
  }, [undoTimer.timeLeft, showUndo]);

  // === COMPUTED VALUES ===
  const isExpired = status === 'expired' || isExpiredLocally || deletionTimer.timeLeft <= 0;
  const canDownload = downloadReady && status === 'completed' && !isExpired;
  const showUndoButton = showUndo && undoTimeLeft > 0 && onUndo;

  // === MEMOIZED COMPUTED VALUES ===
  const cardClasses = useMemo(() => {
    const baseClasses = [
      'bg-white dark:bg-gray-800',
      'border border-gray-200 dark:border-gray-700',
      'rounded-xl',
      'p-4 sm:p-6',
      'shadow-sm',
      'transition-all duration-200'
    ];

    // Status-specific styling
    if (status === 'completed' && !isExpired) {
      baseClasses.push('ring-1 ring-green-200 dark:ring-green-800');
    } else if (status === 'error') {
      baseClasses.push('ring-1 ring-red-200 dark:ring-red-800');
    } else if (isExpired) {
      baseClasses.push('opacity-75');
    }

    return baseClasses.join(' ');
  }, [status, isExpired]);

  const statusText = useMemo(() => {
    if (isExpired) return 'File expired and deleted';
    
    switch (status) {
      case 'processing':
        return 'Processing file...';
      case 'completed':
        return 'Ready for download';
      case 'error':
        return errorMessage || 'Processing failed';
      case 'downloading':
        return 'Download starting...';
      default:
        return 'Unknown status';
    }
  }, [status, isExpired, errorMessage]);

  const statusColor = useMemo(() => {
    if (isExpired) return 'text-gray-600 dark:text-gray-400';
    
    switch (status) {
      case 'processing':
        return 'text-blue-700 dark:text-blue-300';
      case 'completed':
        return 'text-green-700 dark:text-green-300';
      case 'error':
        return 'text-red-700 dark:text-red-300';
      case 'downloading':
        return 'text-purple-700 dark:text-purple-300';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  }, [status, isExpired]);

  // === EVENT HANDLERS ===
  const handleDownload = useCallback(async () => {
    if (canDownload && onDownload) {
      try {
        await onDownload(file);
      } catch (error) {
        console.error('Download failed:', error);
      }
    }
  }, [canDownload, onDownload, file]);

  const handleClear = useCallback(() => {
    onClear?.(file.id);
  }, [onClear, file.id]);

  const handleUndo = useCallback(() => {
    onUndo?.(file.id);
  }, [onUndo, file.id]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // === RENDER HELPERS ===
  const getStatusIcon = () => {
    const iconClasses = "w-5 h-5 flex-shrink-0";
    
    switch (status) {
      case 'processing':
        return (
          <div className={`${iconClasses} animate-spin`}>
            <svg className="w-full h-full text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        );
      case 'completed':
        return (
          <div className={`${iconClasses} text-green-600`}>
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className={`${iconClasses} text-red-600`}>
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'expired':
        return (
          <div className={`${iconClasses} text-gray-400`}>
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'downloading':
        return (
          <div className={`${iconClasses} text-purple-600 animate-pulse`}>
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => statusText;
  const getStatusColor = () => statusColor;
  const getCardClasses = () => cardClasses;

  const renderCountdown = () => {
    if (isExpired || status === 'error') return null;

    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          Auto-delete in{' '}
          <span 
            className={`font-medium tabular-nums ${deletionTimer.timeLeft < 300 ? 'text-red-600 dark:text-red-400' : ''}`}
            role="timer"
            aria-live="polite"
            aria-label={`File will be deleted in ${formatTime(deletionTimer.timeLeft)}`}
          >
            {formatTime(deletionTimer.timeLeft)}
          </span>
        </span>
      </div>
    );
  };

  const renderFileDetails = () => {
    if (!isExpanded) return null;

    return (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-gray-500 dark:text-gray-400">File size:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {formatFileSize(file.size)}
            </span>
          </div>
          
          {file.processingTime && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Processed in:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {formatProcessingTime(file.processingTime)}
              </span>
            </div>
          )}
        </div>

        {file.originalName && file.originalName !== file.name && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Original name:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white break-all">
              {file.originalName}
            </span>
          </div>
        )}

        {file.operation && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Operation:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {file.operation}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderActions = () => {
    const actions = [];

    // Primary download action
    if (canDownload) {
      actions.push(
        <button
          key="download"
          onClick={handleDownload}
          disabled={downloading}
          className="btn btn-primary min-w-[120px]"
          type="button"
          aria-describedby={statusId}
        >
          {downloading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              <span>Downloading...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download</span>
            </>
          )}
        </button>
      );
    }

    // Undo action (higher priority)
    if (showUndoButton) {
      actions.unshift(
        <button
          key="undo"
          onClick={handleUndo}
          className="btn btn-warning"
          type="button"
          aria-label={`Undo processing (${undoTimeLeft}s remaining)`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span>Undo ({undoTimeLeft}s)</span>
        </button>
      );
    }

    // Custom actions
    customActions.map((action, index) => (
      <button
        key={`custom-${index}`}
        onClick={() => action.onClick(file)}
        className={`btn btn-${action.variant || 'secondary'}`}
        type="button"
      >
        {action.icon && <span className="w-4 h-4" aria-hidden="true">{action.icon}</span>}
        <span>{action.label}</span>
      </button>
    )).forEach(button => actions.push(button));

    // Clear/remove action
    if (status !== 'processing') {
      actions.push(
        <button
          key="clear"
          onClick={handleClear}
          className="btn btn-ghost text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
          type="button"
          aria-label={`Remove ${file.name} from list`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Remove</span>
        </button>
      );
    }

    return (
      <div className="flex flex-wrap gap-2 mt-4" id={actionsId}>
        {actions}
      </div>
    );
  };

  // === MAIN RENDER ===
  return (
    <div 
      id={cardId}
      className={`${getCardClasses()} ${className}`}
      data-testid={testId}
      role="region"
      aria-labelledby={titleId}
      aria-describedby={statusId}
    >
      {/* Main content */}
      <div className="flex items-start gap-4">
        {/* Status icon */}
        <div className="flex-shrink-0 mt-1">
          {getStatusIcon()}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 
              id={titleId}
              className="font-medium text-gray-900 dark:text-white truncate pr-2"
              title={file.name}
            >
              {file.name}
            </h3>
            
            {/* Expand/collapse button */}
            <button
              onClick={toggleExpanded}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 -m-1 transition-colors"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Hide file details" : "Show file details"}
              type="button"
            >
              <svg 
                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Status message */}
          <p 
            id={statusId}
            className={`text-sm mb-3 ${getStatusColor()}`}
            aria-live="polite"
          >
            {getStatusText()}
          </p>

          {/* Countdown timer */}
          {renderCountdown()}

          {/* Expanded details */}
          {renderFileDetails()}
        </div>
      </div>

      {/* Action buttons */}
      {renderActions()}

      {/* Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {status === 'completed' && `File ${file.name} is ready for download`}
        {status === 'error' && `Error processing ${file.name}: ${errorMessage}`}
        {isExpired && `File ${file.name} has expired and been deleted`}
      </div>
    </div>
  );
});

FileStatusCard.displayName = 'FileStatusCard';

// === MAIN FILE STATUS COMPONENT ===
export default function FileStatus(props: FileStatusProps) {
  return <FileStatusCard {...props} />;
}

// === BULK FILE STATUS COMPONENT ===
export interface BulkFileStatusProps {
  /** Array of processed files */
  files: Array<ProcessedFile & { 
    status: FileStatusState; 
    timeRemaining?: number;
    errorMessage?: string;
  }>;
  
  /** Global actions */
  onDownloadAll?: (files: ProcessedFile[]) => void;
  onClearAll?: () => void;
  
  /** Individual file callbacks */
  onDownload?: (file: ProcessedFile) => void;
  onClear?: (fileId: string) => void;
  onUndo?: (fileId: string) => void;
  
  /** Whether to show undo options */
  showUndo?: boolean;
  
  /** Maximum files to display without scrolling */
  maxVisible?: number;
  
  /** Additional CSS classes */
  className?: string;
}

export const BulkFileStatus: React.FC<BulkFileStatusProps> = ({
  files,
  onDownloadAll,
  onClearAll,
  onDownload,
  onClear,
  onUndo,
  showUndo = false,
  maxVisible = 5,
  className = ''
}) => {
  const completedFiles = files.filter(f => f.status === 'completed');
  const hasDownloadableFiles = completedFiles.length > 0;

  const renderBulkActions = () => {
    if (files.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        {hasDownloadableFiles && onDownloadAll && (
          <button
            onClick={() => onDownloadAll(completedFiles)}
            className="btn btn-primary"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download All ({completedFiles.length})</span>
          </button>
        )}

        {onClearAll && (
          <button
            onClick={onClearAll}
            className="btn btn-secondary"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Clear All</span>
          </button>
        )}

        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
          <span>{files.length} file{files.length !== 1 ? 's' : ''}</span>
          {hasDownloadableFiles && (
            <span className="ml-2">• {completedFiles.length} ready</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {renderBulkActions()}
      
      <div 
        className={`space-y-4 ${files.length > maxVisible ? 'max-h-[600px] overflow-y-auto' : ''}`}
        role="list"
        aria-label={`${files.length} processed files`}
      >
        {files.map((file) => (
          <div key={file.id} role="listitem">
            <FileStatus
              file={file}
              status={file.status}
              timeRemaining={file.timeRemaining}
              downloadReady={file.status === 'completed'}
              errorMessage={file.errorMessage}
              onDownload={onDownload}
              onClear={onClear}
              onUndo={onUndo}
              showUndo={showUndo}
            />
          </div>
        ))}
      </div>

      {files.length > maxVisible && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Showing all {files.length} files • Scroll to see more
        </div>
      )}
    </div>
  );
};