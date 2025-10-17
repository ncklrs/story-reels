'use client';

import { useState } from 'react';
import GenerationProgress from './GenerationProgress';

interface VideoPreviewProps {
  videoUrl?: string;
  thumbnailUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  sceneId?: string;
  onCancelGeneration?: () => void;
}

export default function VideoPreview({
  videoUrl,
  thumbnailUrl,
  status,
  progress = 0,
  error,
  sceneId,
  onCancelGeneration
}: VideoPreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  /**
   * Download video with CORS-safe method
   */
  const handleDownload = async () => {
    if (!videoUrl) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      // Fetch the video as a blob
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch video');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `scene-${sceneId || 'video'}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Clean up blob URL
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download error:', err);
      setDownloadError('Failed to download video');
    } finally {
      setIsDownloading(false);
    }
  };

  if (status === 'completed' && videoUrl) {
    return (
      <div className="space-y-2">
        <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
          <video
            src={videoUrl}
            controls
            className="w-full h-full"
            poster={thumbnailUrl}
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          {isDownloading ? 'Downloading...' : 'Download Video'}
        </button>

        {downloadError && (
          <p className="text-xs text-red-600 text-center">{downloadError}</p>
        )}
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="w-full aspect-video bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-lg font-semibold mb-2">
            Generation Failed
          </div>
          <div className="text-sm text-red-500 dark:text-red-300">
            {error || 'An error occurred during video generation'}
          </div>
        </div>
      </div>
    );
  }

  if (status === 'processing') {
    // Determine generation status based on progress
    let generationStatus: 'queued' | 'processing' | 'uploading' | 'finalizing' = 'processing';
    if (progress < 10) {
      generationStatus = 'queued';
    } else if (progress >= 90) {
      generationStatus = 'finalizing';
    } else if (progress >= 75) {
      generationStatus = 'uploading';
    }

    return (
      <GenerationProgress
        progress={progress}
        status={generationStatus}
        onCancel={onCancelGeneration}
      />
    );
  }

  return (
    <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="text-center text-gray-500 dark:text-gray-400">
        <svg
          className="mx-auto h-12 w-12 mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm">No video generated yet</p>
      </div>
    </div>
  );
}
