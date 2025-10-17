'use client';

import { useState, useEffect, useCallback } from 'react';

interface SavedStoryboard {
  id: string;
  characterName: string;
  scenesCount: number;
  totalDuration: number;
  videosGenerated: number;
  lastUpdated: string;
}

interface LoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (storyboardId: string) => Promise<void>;
  userId?: string;
}

export default function LoadModal({ isOpen, onClose, onLoad, userId }: LoadModalProps) {
  const [storyboards, setStoryboards] = useState<SavedStoryboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch saved storyboards
  const fetchStoryboards = useCallback(async () => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/storyboards?userId=${userId || 'guest'}`);
      // const data = await response.json();

      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockData: SavedStoryboard[] = [
        {
          id: '1',
          characterName: 'Sarah Chen',
          scenesCount: 5,
          totalDuration: 40,
          videosGenerated: 3,
          lastUpdated: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '2',
          characterName: 'Detective Brooks',
          scenesCount: 8,
          totalDuration: 64,
          videosGenerated: 8,
          lastUpdated: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: '3',
          characterName: 'Alex Rivera',
          scenesCount: 3,
          totalDuration: 24,
          videosGenerated: 0,
          lastUpdated: new Date(Date.now() - 3600000).toISOString(),
        },
      ];

      setStoryboards(mockData);
    } catch (err) {
      setError('Failed to load storyboards');
      console.error('Error fetching storyboards:', err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, userId]);

  useEffect(() => {
    fetchStoryboards();
  }, [fetchStoryboards]);

  // Handle load
  const handleLoad = async (storyboardId: string) => {
    setLoadingId(storyboardId);
    try {
      await onLoad(storyboardId);
      onClose();
    } catch (err) {
      setError('Failed to load storyboard');
      console.error('Error loading storyboard:', err);
    } finally {
      setLoadingId(null);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Format timestamp
  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="load-modal-title"
            className="text-xl font-semibold text-gray-900 dark:text-white"
          >
            Load Storyboard
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg
                className="w-8 h-8 text-blue-600 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg
                  className="w-12 h-12 text-red-500 mx-auto mb-4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-700 dark:text-gray-300">{error}</p>
                <button
                  onClick={fetchStoryboards}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : storyboards.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  No saved storyboards found
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Create your first storyboard to get started
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {storyboards.map((storyboard) => (
                <button
                  key={storyboard.id}
                  onClick={() => handleLoad(storyboard.id)}
                  disabled={loadingId !== null}
                  className="w-full text-left p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {storyboard.characterName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                          </svg>
                          {storyboard.scenesCount} scene{storyboard.scenesCount !== 1 ? 's' : ''}
                        </span>
                        <span>•</span>
                        <span>{storyboard.totalDuration}s total</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          {storyboard.videosGenerated} video{storyboard.videosGenerated !== 1 ? 's' : ''} generated
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Last updated {formatTimestamp(storyboard.lastUpdated)}
                      </div>
                    </div>
                    {loadingId === storyboard.id && (
                      <svg
                        className="w-6 h-6 text-blue-600 animate-spin ml-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
