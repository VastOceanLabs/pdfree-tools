'use client';

// src/components/ErrorBoundary.tsx
/**
 * Error Boundary Component for PDfree.tools
 * Catches React errors and provides user-friendly fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { getConfig, isDevelopment, isFeatureEnabled } from '@/config/environment';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    const { errorId } = this.state;
    
    // Update state with error info
    this.setState({ errorInfo });
    
    // Log error in development
    if (isDevelopment()) {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
    
    // Report error to monitoring service
    if (isFeatureEnabled('enableErrorTracking') && errorId) {
      this.reportError(error, errorInfo, errorId);
    }
    
    // Call custom error handler
    if (onError && errorId) {
      onError(error, errorInfo, errorId);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;
    
    if (hasError && prevProps.resetOnPropsChange !== resetOnPropsChange) {
      if (resetOnPropsChange) {
        this.resetErrorBoundary();
      }
    }
    
    if (hasError && resetKeys) {
      const prevResetKeys = prevProps.resetKeys || [];
      // Improved reset key comparison with length check
      const hasResetKeyChanged = (resetKeys.length !== prevResetKeys.length) ||
        resetKeys.some((key, index) => key !== prevResetKeys[index]);
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    try {
      // Report to Sentry or other error tracking service
      const config = getConfig();
      if (config.monitoring.sentryDsn && typeof window !== 'undefined') {
        const { captureException } = await import('@sentry/browser');
        captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
          tags: {
            errorBoundary: true,
            errorId,
          },
          extra: {
            props: this.props,
            state: this.state,
          },
        });
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }
    
    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
      });
    }, 100);
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleRetry = () => {
    this.resetErrorBoundary();
  };

  render() {
    const { hasError, error, errorId } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Custom fallback UI
      if (fallback) {
        return fallback;
      }

      // Default error UI with accessibility features
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg 
                  className="h-8 w-8 text-red-500" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-medium text-gray-900 dark:text-white">
                  Something went wrong
                </h1>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We encountered an unexpected error while processing your request. 
                This has been automatically reported to our team.
              </p>
              
              {isDevelopment() && error && (
                <details className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                    Error details (Development only)
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                    {error.toString()}
                  </pre>
                </details>
              )}
              
              {errorId && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                  Error ID: {errorId}
                </p>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                aria-describedby="retry-description"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                aria-describedby="reload-description"
              >
                Reload Page
              </button>
            </div>
            
            {/* Screen reader descriptions */}
            <div className="sr-only">
              <p id="retry-description">
                Attempts to recover from the error without reloading the page
              </p>
              <p id="reload-description">
                Reloads the entire page to start fresh
              </p>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Convenience wrapper for functional components
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  resetKeys?: Array<string | number>;
}

export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = (props: P & ErrorBoundaryWrapperProps) => {
    const { children, fallback, resetKeys, ...componentProps } = props;
    
    return (
      <ErrorBoundary 
        fallback={fallback} 
        resetKeys={resetKeys}
        resetOnPropsChange={true}
      >
        <Component {...(componentProps as P)} />
      </ErrorBoundary>
    );
  };
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default ErrorBoundary;