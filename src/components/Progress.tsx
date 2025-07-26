// src/components/Progress.tsx
// Production-ready progress component following PDfree.tools design system

import React, { useEffect, useRef, useState, useId, memo } from 'react';

// === TYPES ===
export interface ProgressProps {
  /** Current progress value (0-100) */
  value: number;
  
  /** Maximum progress value (default: 100) */
  max?: number;
  
  /** Minimum progress value (default: 0) */
  min?: number;
  
  /** Size variant of the progress bar */
  size?: 'sm' | 'base' | 'lg';
  
  /** Color variant following PDfree.tools design system */
  variant?: 'primary' | 'success' | 'warning' | 'error';
  
  /** Processing status message to display */
  status?: string;
  
  /** Show percentage text */
  showPercentage?: boolean;
  
  /** Show time remaining estimate */
  timeRemaining?: string;
  
  /** Custom label for screen readers */
  label?: string;
  
  /** Whether the progress is indeterminate (loading state) */
  indeterminate?: boolean;
  
  /** Whether to animate the progress bar */
  animated?: boolean;
  
  /** Whether to show pulse animation on the bar */
  pulse?: boolean;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Callback when progress reaches 100% */
  onComplete?: () => void;
  
  /** Test ID for testing */
  testId?: string;
}

// === PROGRESS BAR COMPONENT ===
const ProgressBar = memo<{
  value: number;
  max: number;
  min: number;
  size: 'sm' | 'base' | 'lg';
  variant: 'primary' | 'success' | 'warning' | 'error';
  indeterminate: boolean;
  animated: boolean;
  pulse: boolean;
  progressId: string;
  statusId?: string;
  announcementId: string;
  hasAnnouncement: boolean;
}>(({ 
  value, 
  max, 
  min, 
  size, 
  variant, 
  indeterminate, 
  animated, 
  pulse, 
  progressId, 
  statusId,
  announcementId,
  hasAnnouncement 
}) => {
  // Guard against divide-by-zero / NaN when max === min
  const range = Math.max(1, max - min);
  const percentage = Math.min(100, Math.max(0, ((value - min) / range) * 100));

  // Check if user prefers reduced motion
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const shouldAnimate = animated && !prefersReducedMotion;

  // Size classes
  const sizeClasses = {
    sm: 'h-1',
    base: 'h-2',
    lg: 'h-3'
  };

  // Use standard Tailwind colors instead of custom success/warning variants
  const trackClasses = {
    primary: 'bg-gray-200 dark:bg-gray-700',
    success: 'bg-green-100 dark:bg-green-900',
    warning: 'bg-yellow-100 dark:bg-yellow-900',
    error: 'bg-red-100 dark:bg-red-900'
  };

  const fillClasses = {
    primary: 'bg-blue-600 dark:bg-blue-500',
    success: 'bg-green-600 dark:bg-green-500',
    warning: 'bg-yellow-600 dark:bg-yellow-500',
    error: 'bg-red-600 dark:bg-red-500'
  };

  // Animation classes - only add if animations are enabled
  const getAnimationClasses = () => {
    const classes = [];
    if (shouldAnimate && !indeterminate) {
      classes.push('transition-all duration-500 ease-out');
    }
    if (pulse && shouldAnimate) {
      classes.push('animate-pulse');
    }
    return classes.join(' ');
  };

  // Build aria-describedby string properly
  const describedBy = [
    statusId,
    hasAnnouncement ? announcementId : undefined
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div
      className={`
        w-full rounded-full overflow-hidden relative
        ${sizeClasses[size]}
        ${trackClasses[variant]}
      `}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-labelledby={progressId}
      aria-describedby={describedBy}
      data-testid="progress-bar"
    >
      {indeterminate ? (
        // Indeterminate progress with optional shimmer (only if animations enabled)
        <div
          className={`
            h-full w-full relative overflow-hidden
            ${fillClasses[variant]}
            ${shouldAnimate ? 'animate-pulse' : ''}
          `}
        >
          {shouldAnimate && (
            <div
              className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
              aria-hidden="true"
            />
          )}
        </div>
      ) : (
        // Determinate progress
        <div
          className={`
            h-full rounded-full relative overflow-hidden
            ${fillClasses[variant]}
            ${getAnimationClasses()}
          `}
          style={{ 
            width: `${percentage}%`,
            minWidth: percentage > 0 ? '2px' : '0px' // Minimum visible width
          }}
        >
          {/* Shimmer effect for animated progress */}
          {shouldAnimate && percentage > 0 && (
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
              aria-hidden="true"
            />
          )}
        </div>
      )}
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

// === MAIN PROGRESS COMPONENT ===
export default function Progress({
  value = 0,
  max = 100,
  min = 0,
  size = 'base',
  variant = 'primary',
  status,
  showPercentage = true,
  timeRemaining,
  label,
  indeterminate = false,
  animated = true,
  pulse = false,
  className = '',
  onComplete,
  testId = 'progress'
}: ProgressProps) {
  // === STATE ===
  const [previousValue, setPreviousValue] = useState(value);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  // === REFS ===
  const progressRef = useRef<HTMLDivElement>(null);
  // Fixed: Use cross-environment timeout typing
  const announcementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // === IDS FOR ACCESSIBILITY ===
  const progressId = useId();
  const statusId = useId();
  const announcementId = useId();

  // === COMPUTED VALUES ===
  // Guard against divide-by-zero
  const range = Math.max(1, max - min);
  const percentage = indeterminate ? 0 : Math.min(100, Math.max(0, ((value - min) / range) * 100));
  const isComplete = !indeterminate && value >= max;

  // Validate props in development
  if (process.env.NODE_ENV === 'development') {
    if (max <= min) {
      console.warn(`Progress: max (${max}) should be greater than min (${min})`);
    }
    if (value < min || value > max) {
      console.warn(`Progress: value (${value}) should be between min (${min}) and max (${max})`);
    }
  }

  // === EFFECTS ===

  // Handle completion
  useEffect(() => {
    if (isComplete && !hasCompleted) {
      setHasCompleted(true);
      onComplete?.();
      setAnnouncement('Progress completed');
    } else if (!isComplete && hasCompleted) {
      setHasCompleted(false);
    }
  }, [isComplete, hasCompleted, onComplete]);

  // Handle progress announcements for screen readers
  useEffect(() => {
    if (indeterminate) return;

    // Fixed: Base percentage change on actual percentage, not raw value
    const currentPercentage = Math.round(percentage);
    const previousPercentage = Math.round(((previousValue - min) / range) * 100);
    const percentageDifference = Math.abs(currentPercentage - previousPercentage);
    
    const isSignificantChange = percentageDifference >= 10; // Announce every 10% change
    
    if (isSignificantChange && value > previousValue) {
      // Clear any pending announcement
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
        announcementTimeoutRef.current = null;
      }

      // Delay announcement to avoid spam
      announcementTimeoutRef.current = setTimeout(() => {
        setAnnouncement(`Progress: ${currentPercentage}%`);
        announcementTimeoutRef.current = null;
      }, 500);

      setPreviousValue(value);
    }
  }, [value, previousValue, percentage, indeterminate, min, range]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
        announcementTimeoutRef.current = null;
      }
    };
  }, []);

  // Clear announcement after it's been read
  useEffect(() => {
    if (announcement) {
      const timer = setTimeout(() => {
        setAnnouncement('');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [announcement]);

  // === RENDER HELPERS ===
  const renderStatusText = () => {
    if (!status && !showPercentage && !timeRemaining) return null;

    return (
      <div className="flex items-center justify-between text-sm mb-2">
        {/* Status message */}
        <div className="flex-1 min-w-0">
          {status && (
            <p 
              id={statusId}
              className="text-gray-700 dark:text-gray-300 truncate"
              title={status}
            >
              {status}
            </p>
          )}
        </div>

        {/* Percentage and time remaining */}
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 flex-shrink-0">
          {showPercentage && !indeterminate && (
            <span className="font-medium tabular-nums">
              {Math.round(percentage)}%
            </span>
          )}
          
          {timeRemaining && (
            <span className="text-xs">
              {timeRemaining}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderProgressText = () => {
    if (indeterminate) {
      return label || status || 'Loading...';
    }
    
    const percentText = `${Math.round(percentage)}%`;
    const baseText = label || `Progress: ${percentText}`;
    
    if (status) {
      return `${status} - ${percentText}`;
    }
    
    return baseText;
  };

  // === MAIN RENDER ===
  return (
    <div 
      ref={progressRef}
      className={`w-full ${className}`}
      data-testid={testId}
    >
      {/* Status text and percentage */}
      {renderStatusText()}

      {/* Progress bar container */}
      <div className="relative">
        <ProgressBar
          value={value}
          max={max}
          min={min}
          size={size}
          variant={variant}
          indeterminate={indeterminate}
          animated={animated}
          pulse={pulse}
          progressId={progressId}
          statusId={status ? statusId : undefined}
          announcementId={announcementId}
          hasAnnouncement={!!announcement}
        />

        {/* Progress label (visually hidden but available to screen readers) */}
        <span 
          id={progressId}
          className="sr-only"
        >
          {renderProgressText()}
        </span>
      </div>

      {/* Live region for progress announcements */}
      <div
        id={announcementId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Completion state */}
      {isComplete && (
        <div 
          role="status" 
          aria-live="polite"
          className="sr-only"
        >
          Task completed successfully
        </div>
      )}
    </div>
  );
}

// === HELPER COMPONENTS FOR COMMON USE CASES ===

/**
 * File Upload Progress - Specialized for file operations
 */
export const FileUploadProgress: React.FC<{
  fileName: string;
  progress: number;
  status?: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  onCancel?: () => void;
}> = ({ fileName, progress, status = 'uploading', error, onCancel }) => {
  const getStatusMessage = () => {
    switch (status) {
      case 'uploading':
        return `Uploading ${fileName}...`;
      case 'processing':
        return `Processing ${fileName}...`;
      case 'complete':
        return `${fileName} completed successfully`;
      case 'error':
        return error || `Error processing ${fileName}`;
      default:
        return `Working on ${fileName}...`;
    }
  };

  const getVariant = (): 'primary' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'complete':
        return 'success';
      case 'error':
        return 'error';
      case 'processing':
        return 'warning';
      default:
        return 'primary';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {fileName}
        </span>
        {onCancel && status !== 'complete' && status !== 'error' && (
          <button
            onClick={onCancel}
            className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 ml-2 transition-colors"
            type="button"
            aria-label={`Cancel upload of ${fileName}`}
          >
            Cancel
          </button>
        )}
      </div>
      
      <Progress
        value={progress}
        status={getStatusMessage()}
        variant={getVariant()}
        size="sm"
        showPercentage={status !== 'error'}
        indeterminate={status === 'processing' && progress === 0}
      />
    </div>
  );
};

/**
 * Bulk Operation Progress - For processing multiple files
 */
export const BulkProgress: React.FC<{
  currentFile: number;
  totalFiles: number;
  currentFileName?: string;
  overallProgress: number;
  fileProgress: number;
}> = ({ currentFile, totalFiles, currentFileName, overallProgress, fileProgress }) => {
  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-900 dark:text-white">
            Processing files ({currentFile} of {totalFiles})
          </span>
          <span className="text-gray-600 dark:text-gray-400 tabular-nums">
            {Math.round(overallProgress)}%
          </span>
        </div>
        <Progress
          value={overallProgress}
          variant="primary"
          size="base"
          showPercentage={false}
          label={`Overall progress: ${currentFile} of ${totalFiles} files processed`}
        />
      </div>

      {/* Current file progress */}
      {currentFileName && (
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Current: <span className="font-medium">{currentFileName}</span>
          </div>
          <Progress
            value={fileProgress}
            variant="success"
            size="sm"
            showPercentage={true}
            animated={true}
            label={`Processing ${currentFileName}`}
          />
        </div>
      )}
    </div>
  );
};