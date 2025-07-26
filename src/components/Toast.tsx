// src/components/Toast.tsx
// Production-ready toast notification system for PDfree.tools
// FIXED: Progress bar timing, SSR safety, accessibility, and type issues

import React, { useEffect, useRef, useState, useCallback, createContext, useContext, useId, memo } from 'react';
import { createPortal } from 'react-dom';

// === TYPES ===
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface ToastData {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = no auto-dismiss
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  persistent?: boolean; // Don't auto-dismiss on blur/focus changes
}

interface ToastContextValue {
  addToast: (toast: Omit<ToastData, 'id'>) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Omit<ToastData, 'id'>>) => void;
  clearAll: () => void;
  toasts: ToastData[];
}

// === CONSTANTS ===
const DEFAULT_DURATION = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000
} as const;

const ANIMATION_DURATION = 300; // Match CSS transition duration
const PROGRESS_UPDATE_INTERVAL = 50; // Update progress every 50ms for smooth animation

// === BROWSER DETECTION ===
const isBrowser = typeof window !== 'undefined';

// === TOAST CONTEXT ===
const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// === INDIVIDUAL TOAST COMPONENT ===
interface ToastProps {
  toast: ToastData;
  onRemove: (id: string) => void;
  position: ToastPosition;
  index: number;
}

const Toast = memo<ToastProps>(({ toast, onRemove, position, index }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100
  const [isPaused, setIsPaused] = useState(false);
  
  const toastRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const totalPausedTimeRef = useRef<number>(0);
  
  const toastId = useId();
  const titleId = useId();
  const messageId = useId();

  // FIXED: Progress bar animation with interval updates
  const startProgressAnimation = useCallback(() => {
    if (!toast.duration || toast.duration === 0 || !isBrowser) return;
    
    startTimeRef.current = Date.now();
    totalPausedTimeRef.current = 0;
    
    // Update progress every 50ms for smooth animation
    progressIntervalRef.current = setInterval(() => {
      if (isPaused) return; // Don't update while paused
      
      const now = Date.now();
      const elapsed = now - startTimeRef.current - totalPausedTimeRef.current;
      const newProgress = Math.min(100, (elapsed / toast.duration!) * 100);
      
      setProgress(newProgress);
      
      // Auto-remove when complete (with small buffer to avoid race conditions)
      if (newProgress >= 99.9 && !toast.persistent) {
        handleRemove();
      }
    }, PROGRESS_UPDATE_INTERVAL);
  }, [toast.duration, toast.persistent, isPaused]);

  const pauseProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
      pausedAtRef.current = Date.now();
      setIsPaused(true);
    }
  }, []);

  const resumeProgress = useCallback(() => {
    if (isPaused && toast.duration) {
      // Add the time we were paused to total paused time
      const pauseDuration = Date.now() - pausedAtRef.current;
      totalPausedTimeRef.current += pauseDuration;
      
      setIsPaused(false);
      startProgressAnimation();
    }
  }, [isPaused, toast.duration, startProgressAnimation]);

  // FIXED: Animation duration match
  const handleRemove = useCallback(() => {
    if (isRemoving) return; // Prevent double-removal
    
    setIsRemoving(true);
    
    // Clean up timers immediately
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    // Wait for CSS animation to complete before removing from state
    setTimeout(() => {
      onRemove(toast.id);
    }, ANIMATION_DURATION);
  }, [toast.id, onRemove, isRemoving]);

  // Initialize toast
  useEffect(() => {
    if (!isBrowser) return;
    
    // Show toast with slight delay for animation
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    
    // Start progress tracking if duration is set
    if (toast.duration && toast.duration > 0) {
      startProgressAnimation();
    }

    return () => {
      clearTimeout(showTimer);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []); // Empty deps intentional - only run on mount

  // Handle hover pause/resume
  const handleMouseEnter = useCallback(() => {
    if (toast.duration && toast.duration > 0) {
      pauseProgress();
    }
  }, [toast.duration, pauseProgress]);

  const handleMouseLeave = useCallback(() => {
    if (toast.duration && toast.duration > 0) {
      resumeProgress();
    }
  }, [toast.duration, resumeProgress]);

  // Handle focus pause/resume
  const handleFocus = useCallback(() => {
    if (toast.duration && toast.duration > 0) {
      pauseProgress();
    }
  }, [toast.duration, pauseProgress]);

  const handleBlur = useCallback(() => {
    if (toast.duration && toast.duration > 0 && !toast.persistent) {
      resumeProgress();
    }
  }, [toast.duration, toast.persistent, resumeProgress]);

  // Keyboard handling
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && toast.dismissible !== false) {
      e.preventDefault();
      e.stopPropagation();
      handleRemove();
    }
  }, [toast.dismissible, handleRemove]);

  // Variant styles
  const getVariantStyles = () => {
    const baseClasses = 'border-l-4 shadow-lg ring-1 ring-black ring-opacity-5';
    
    switch (toast.variant) {
      case 'success':
        return `${baseClasses} border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200`;
      case 'error':
        return `${baseClasses} border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200`;
      case 'warning':
        return `${baseClasses} border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200`;
      case 'info':
        return `${baseClasses} border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200`;
      default:
        return `${baseClasses} border-gray-500 bg-gray-50 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200`;
    }
  };

  const getIcon = () => {
    const iconClasses = "w-5 h-5 flex-shrink-0";
    
    switch (toast.variant) {
      case 'success':
        return (
          <svg className={`${iconClasses} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className={`${iconClasses} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={`${iconClasses} text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.036 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
        return (
          <svg className={`${iconClasses} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Position-based transform classes
  const getPositionTransform = () => {
    const baseTransition = `transform transition-all duration-${ANIMATION_DURATION} ease-in-out`;
    
    if (position.includes('right')) {
      return `${baseTransition} ${isVisible && !isRemoving ? 'translate-x-0' : 'translate-x-full'}`;
    }
    if (position.includes('left')) {
      return `${baseTransition} ${isVisible && !isRemoving ? 'translate-x-0' : '-translate-x-full'}`;
    }
    if (position.includes('top')) {
      return `${baseTransition} ${isVisible && !isRemoving ? 'translate-y-0' : '-translate-y-full'}`;
    }
    if (position.includes('bottom')) {
      return `${baseTransition} ${isVisible && !isRemoving ? 'translate-y-0' : 'translate-y-full'}`;
    }
    return `${baseTransition} ${isVisible && !isRemoving ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`;
  };

  if (!isBrowser) return null;

  return (
    <div
      ref={toastRef}
      id={toastId}
      role="alert"
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      aria-labelledby={titleId}
      aria-describedby={toast.message ? messageId : undefined}
      className={`
        relative max-w-sm w-full pointer-events-auto rounded-lg
        ${getVariantStyles()}
        ${getPositionTransform()}
        ${isPaused ? 'ring-2 ring-blue-500' : ''}
      `}
      style={{
        zIndex: 1080 - index, // FIXED: Newest toasts on top
        marginBottom: '8px'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      tabIndex={toast.action || toast.dismissible !== false ? 0 : -1}
    >
      {/* FIXED: Progress bar with smooth animation */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/10 rounded-t-lg overflow-hidden">
          <div
            className={`h-full bg-current transition-all duration-100 ${isPaused ? 'animate-pulse' : ''}`}
            style={{
              width: `${progress}%`,
              transition: isPaused ? 'none' : 'width 100ms linear'
            }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Time remaining: ${Math.round(100 - progress)}%`}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start">
          {/* Icon */}
          <div className="flex-shrink-0">
            {getIcon()}
          </div>

          {/* Content */}
          <div className="ml-3 w-0 flex-1">
            <div className="text-sm font-medium" id={titleId}>
              {toast.title}
            </div>
            
            {toast.message && (
              <div className="mt-1 text-sm opacity-90" id={messageId}>
                {toast.message}
              </div>
            )}

            {/* Action button */}
            {toast.action && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.action!.onClick();
                    handleRemove();
                  }}
                  className="bg-white/20 hover:bg-white/30 text-current px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2 focus:ring-offset-transparent"
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>

          {/* Dismiss button */}
          {toast.dismissible !== false && (
            <div className="ml-4 flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                aria-label="Dismiss notification"
                className="inline-flex rounded-md p-1.5 hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2 focus:ring-offset-transparent transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Screen reader only status */}
      <div className="sr-only" aria-live="polite">
        {isPaused && toast.duration ? 'Notification paused' : ''}
      </div>
    </div>
  );
});

Toast.displayName = 'Toast';

// === TOAST CONTAINER ===
interface ToastContainerProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
  position?: ToastPosition;
  maxToasts?: number;
}

const ToastContainer = memo<ToastContainerProps>(({ 
  toasts, 
  onRemove, 
  position = 'top-right',
  maxToasts = 5 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // FIXED: Limit number of toasts with proper eviction
  const visibleToasts = toasts.slice(-maxToasts);

  // Global escape key handler for top toast
  useEffect(() => {
    if (!isBrowser || visibleToasts.length === 0) return;

    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const topToast = visibleToasts[visibleToasts.length - 1];
        if (topToast && topToast.dismissible !== false) {
          e.preventDefault();
          onRemove(topToast.id);
        }
      }
    };

    document.addEventListener('keydown', handleGlobalEscape);
    return () => document.removeEventListener('keydown', handleGlobalEscape);
  }, [visibleToasts, onRemove]);

  // Position classes
  const getPositionClasses = () => {
    const baseClasses = 'fixed z-50 flex flex-col pointer-events-none';
    
    switch (position) {
      case 'top-right':
        return `${baseClasses} top-4 right-4 sm:top-6 sm:right-6`;
      case 'top-left':
        return `${baseClasses} top-4 left-4 sm:top-6 sm:left-6`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4 sm:bottom-6 sm:right-6 flex-col-reverse`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4 sm:bottom-6 sm:left-6 flex-col-reverse`;
      case 'top-center':
        return `${baseClasses} top-4 left-1/2 transform -translate-x-1/2 sm:top-6`;
      case 'bottom-center':
        return `${baseClasses} bottom-4 left-1/2 transform -translate-x-1/2 sm:bottom-6 flex-col-reverse`;
      default:
        return `${baseClasses} top-4 right-4 sm:top-6 sm:right-6`;
    }
  };

  if (!isBrowser || visibleToasts.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={getPositionClasses()}
      aria-label="Notifications"
      aria-live="polite"
      role="region"
    >
      {visibleToasts.map((toast, index) => (
        <Toast
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
          position={position}
          index={index}
        />
      ))}
      
      {/* Screen reader announcement for multiple toasts */}
      {visibleToasts.length > 1 && (
        <div className="sr-only" aria-live="polite">
          {visibleToasts.length} notifications active
        </div>
      )}
    </div>
  );
});

ToastContainer.displayName = 'ToastContainer';

// === TOAST PROVIDER ===
interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  position = 'top-right',
  maxToasts = 5 
}) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const createdPortalRef = useRef(false);

  // FIXED: SSR-safe portal container creation
  useEffect(() => {
    if (!isBrowser) return;

    let container = document.getElementById('toast-portal');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-portal';
      document.body.appendChild(container);
      createdPortalRef.current = true;
    }
    
    setPortalContainer(container);

    return () => {
      // Only clean up if we created the portal and it's empty
      if (createdPortalRef.current && container && container.children.length === 0) {
        try {
          document.body.removeChild(container);
        } catch (e) {
          // Container might already be removed
        }
      }
    };
  }, []);

  const addToast = useCallback((toastData: Omit<ToastData, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`; // FIXED: Use slice instead of substr
    const duration = toastData.duration ?? DEFAULT_DURATION[toastData.variant];
    
    const newToast: ToastData = {
      ...toastData,
      id,
      duration,
      dismissible: toastData.dismissible ?? true
    };

    setToasts(prev => {
      // FIXED: Auto-evict old toasts when exceeding limit
      const newToasts = [...prev, newToast];
      return newToasts.length > maxToasts ? newToasts.slice(-maxToasts) : newToasts;
    });
    
    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // FIXED: Add updateToast functionality
  const updateToast = useCallback((id: string, updates: Partial<Omit<ToastData, 'id'>>) => {
    setToasts(prev => 
      prev.map(toast => 
        toast.id === id ? { ...toast, ...updates } : toast
      )
    );
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: ToastContextValue = {
    addToast,
    removeToast,
    updateToast,
    clearAll,
    toasts
  };

  // FIXED: SSR safety
  if (!isBrowser) {
    return <ToastContext.Provider value={contextValue}>{children}</ToastContext.Provider>;
  }

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {portalContainer && createPortal(
        <ToastContainer
          toasts={toasts}
          onRemove={removeToast}
          position={position}
          maxToasts={maxToasts}
        />,
        portalContainer
      )}
    </ToastContext.Provider>
  );
};

// === CONVENIENCE HOOKS ===
export const useToastActions = () => {
  const { addToast, removeToast, clearAll, updateToast } = useToast();

  const success = useCallback((title: string, message?: string, options?: Partial<ToastData>) => {
    return addToast({ variant: 'success', title, message, ...options });
  }, [addToast]);

  const error = useCallback((title: string, message?: string, options?: Partial<ToastData>) => {
    return addToast({ variant: 'error', title, message, ...options });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string, options?: Partial<ToastData>) => {
    return addToast({ variant: 'warning', title, message, ...options });
  }, [addToast]);

  const info = useCallback((title: string, message?: string, options?: Partial<ToastData>) => {
    return addToast({ variant: 'info', title, message, ...options });
  }, [addToast]);

  return { 
    success, 
    error, 
    warning, 
    info, 
    remove: removeToast, 
    clearAll, 
    update: updateToast 
  };
};

// === EXPORT HELPER FUNCTIONS ===
export const createToast = {
  success: (title: string, message?: string, options?: Partial<ToastData>) => ({
    variant: 'success' as const,
    title,
    message,
    ...options
  }),
  error: (title: string, message?: string, options?: Partial<ToastData>) => ({
    variant: 'error' as const,
    title,
    message,
    ...options
  }),
  warning: (title: string, message?: string, options?: Partial<ToastData>) => ({
    variant: 'warning' as const,
    title,
    message,
    ...options
  }),
  info: (title: string, message?: string, options?: Partial<ToastData>) => ({
    variant: 'info' as const,
    title,
    message,
    ...options
  })
};

// FIXED: Export the provider as default instead of internal Toast
export default ToastProvider;