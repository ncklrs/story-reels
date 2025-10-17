'use client';

import { useState, useEffect } from 'react';

interface GenerationProgressProps {
  progress: number;
  status: 'queued' | 'processing' | 'uploading' | 'finalizing';
  onCancel?: () => void;
}

/**
 * Enhanced progress component with animation and detailed status
 */
export default function GenerationProgress({
  progress,
  status,
  onCancel,
}: GenerationProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [estimatedRemaining, setEstimatedRemaining] = useState<number | null>(null);

  // Track elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Estimate remaining time based on progress
  useEffect(() => {
    if (progress > 10) {
      const timePerPercent = elapsedSeconds / progress;
      const remaining = Math.ceil((100 - progress) * timePerPercent);
      setEstimatedRemaining(remaining);
    }
  }, [progress, elapsedSeconds]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status display text
  const getStatusText = (): string => {
    switch (status) {
      case 'queued':
        return 'Queued';
      case 'processing':
        return 'Generating Video';
      case 'uploading':
        return 'Uploading';
      case 'finalizing':
        return 'Finalizing';
      default:
        return 'Processing';
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (status) {
      case 'queued':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'uploading':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
    }
  };

  return (
    <div className="w-full aspect-video bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg flex flex-col items-center justify-center p-6">
      {/* Status Icon */}
      <div className="mb-4 text-blue-600 dark:text-blue-400">
        {getStatusIcon()}
      </div>

      {/* Status Text */}
      <div className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">
        {getStatusText()}
      </div>

      {/* Progress Bar with Shimmer Effect */}
      <div className="w-full max-w-md mb-3">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden relative">
          {/* Progress Fill */}
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Progress Percentage */}
      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
        {progress}%
      </div>

      {/* Time Information */}
      <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Elapsed: {formatTime(elapsedSeconds)}</span>
        </div>
        {estimatedRemaining !== null && estimatedRemaining > 0 && (
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>Est. Remaining: {formatTime(estimatedRemaining)}</span>
          </div>
        )}
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full ${status === 'queued' ? 'bg-blue-600 animate-pulse' : 'bg-green-600'}`} />
        <span className="text-xs text-gray-600 dark:text-gray-400">Queued</span>

        <div className="w-8 h-0.5 bg-gray-300 dark:bg-gray-600" />

        <div className={`w-2 h-2 rounded-full ${status === 'processing' ? 'bg-blue-600 animate-pulse' : status === 'queued' ? 'bg-gray-300 dark:bg-gray-600' : 'bg-green-600'}`} />
        <span className="text-xs text-gray-600 dark:text-gray-400">Processing</span>

        <div className="w-8 h-0.5 bg-gray-300 dark:bg-gray-600" />

        <div className={`w-2 h-2 rounded-full ${status === 'uploading' ? 'bg-blue-600 animate-pulse' : ['queued', 'processing'].includes(status) ? 'bg-gray-300 dark:bg-gray-600' : 'bg-green-600'}`} />
        <span className="text-xs text-gray-600 dark:text-gray-400">Uploading</span>

        <div className="w-8 h-0.5 bg-gray-300 dark:bg-gray-600" />

        <div className={`w-2 h-2 rounded-full ${status === 'finalizing' ? 'bg-blue-600 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
        <span className="text-xs text-gray-600 dark:text-gray-400">Complete</span>
      </div>

      {/* Cancel Button */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
        >
          Cancel Generation
        </button>
      )}

      {/* Add shimmer animation styles */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
