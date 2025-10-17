'use client';

import { useState } from 'react';

/**
 * Props for ErrorMessage component
 */
interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  error?: Error;
  variant?: 'error' | 'warning' | 'info';
}

/**
 * Full error message component with retry button and error details
 */
export function ErrorMessage({
  title,
  message,
  onRetry,
  error,
  variant = 'error'
}: ErrorMessageProps) {
  const [showDetails, setShowDetails] = useState(false);

  const variantStyles = {
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-600 dark:text-red-400',
      titleColor: 'text-red-800 dark:text-red-300',
      textColor: 'text-red-700 dark:text-red-400',
      buttonColor: 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      titleColor: 'text-yellow-800 dark:text-yellow-300',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      buttonColor: 'text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-800 dark:text-blue-300',
      textColor: 'text-blue-700 dark:text-blue-400',
      buttonColor: 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300',
    },
  }[variant];

  return (
    <div
      className={`${variantStyles.bg} border ${variantStyles.border} rounded-lg p-4`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start">
        <svg
          className={`w-5 h-5 ${variantStyles.iconColor} mt-0.5 flex-shrink-0`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          {variant === 'error' && (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          )}
          {variant === 'warning' && (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          )}
          {variant === 'info' && (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          )}
        </svg>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${variantStyles.titleColor} mb-1`}>
              {title}
            </h3>
          )}
          <p className={`text-sm ${variantStyles.textColor}`}>{message}</p>
          {error && process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary
                className={`text-xs ${variantStyles.buttonColor} cursor-pointer select-none`}
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide' : 'Show'} Error Details
              </summary>
              <pre className={`text-xs mt-2 ${variantStyles.textColor} overflow-x-auto p-2 bg-black/10 dark:bg-white/10 rounded`}>
                {error.stack || error.message}
              </pre>
            </details>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className={`mt-3 inline-flex items-center text-sm font-medium ${variantStyles.buttonColor} transition-colors`}
              aria-label="Retry the failed operation"
            >
              Try Again
              <svg
                className="ml-1 w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline error for form fields - smaller and more compact
 */
export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
      <svg
        className="w-3 h-3 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}

/**
 * Banner error for top-of-page errors
 */
export function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      className="bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm font-medium">{message}</span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-white/80 hover:text-white transition-colors"
          aria-label="Dismiss error"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * Card error - for errors within cards
 */
export function CardError({
  title = 'Error',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="text-center py-8 px-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
        <svg
          className="w-6 h-6 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          aria-label="Retry the failed operation"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

/**
 * 404 Not Found error
 */
export function NotFoundError({
  title = 'Not Found',
  message = 'The item you are looking for could not be found.',
  onBack,
}: {
  title?: string;
  message?: string;
  onBack?: () => void;
}) {
  return (
    <div className="text-center py-12 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg
            className="mr-2 w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Go Back
        </button>
      )}
    </div>
  );
}
