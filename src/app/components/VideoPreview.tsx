'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import GenerationProgress from './GenerationProgress';
import { VideoPreviewSkeleton } from './Skeletons';
import { ErrorMessage } from './ErrorDisplay';
import { NoVideoYet } from './EmptyStates';
import { useToast } from './ToastContext';

interface VideoPreviewProps {
  videoUrl?: string;
  thumbnailUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  sceneId?: string;
  onCancelGeneration?: () => void;
  onRetry?: () => void;
}

export default function VideoPreview({
  videoUrl,
  thumbnailUrl,
  status,
  progress = 0,
  error,
  sceneId,
  onCancelGeneration,
  onRetry
}: VideoPreviewProps) {
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setVideoLoading(false);
      setVideoError(false);
    };

    const handleError = () => {
      setVideoLoading(false);
      setVideoError(true);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowleft':
          e.preventDefault();
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          break;
        case 'arrowright':
          e.preventDefault();
          videoRef.current.currentTime = Math.min(
            videoRef.current.duration,
            videoRef.current.currentTime + 5
          );
          break;
      }
    };

    if (status === 'completed' && videoUrl) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [status, videoUrl]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  /**
   * Toggle play/pause
   */
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, []);

  /**
   * Toggle fullscreen
   */
  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;

    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
        showToast('Fullscreen not supported', 'error');
      });
    } else {
      document.exitFullscreen();
    }
  }, [showToast]);

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;

    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  }, [isMuted]);

  /**
   * Change playback speed
   */
  const handleSpeedChange = useCallback((speed: number) => {
    if (!videoRef.current) return;

    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    showToast(`Playback speed: ${speed}x`, 'info');
  }, [showToast]);

  /**
   * Change volume
   */
  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!videoRef.current) return;

    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
      videoRef.current.muted = true;
    } else if (isMuted) {
      setIsMuted(false);
      videoRef.current.muted = false;
    }
  }, [isMuted]);

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
      const fileSizeMB = (blob.size / (1024 * 1024)).toFixed(2);

      // Create download link
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `scene-${sceneId || 'video'}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Clean up blob URL
      window.URL.revokeObjectURL(blobUrl);

      showToast(`Video downloaded (${fileSizeMB} MB)`, 'success');
    } catch (err) {
      console.error('Download error:', err);
      setDownloadError('Failed to download video');
      showToast('Failed to download video', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Share video via Web Share API or copy link
   */
  const handleShare = async () => {
    if (!videoUrl) return;

    // Try Web Share API first (mobile/modern browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI Generated Video',
          text: 'Check out this AI-generated video!',
          url: videoUrl,
        });
        showToast('Video shared successfully!', 'success');
      } catch (err: any) {
        // AbortError means user cancelled, don't show error
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
          // Fallback to copy link
          fallbackCopyLink();
        }
      }
    } else {
      // Fallback: Copy link to clipboard
      fallbackCopyLink();
    }
  };

  /**
   * Fallback: Copy video URL to clipboard
   */
  const fallbackCopyLink = () => {
    if (!videoUrl) return;

    navigator.clipboard.writeText(videoUrl).then(
      () => showToast('Link copied to clipboard!', 'success'),
      () => showToast('Failed to copy link', 'error')
    );
  };

  if (status === 'completed' && videoUrl) {
    return (
      <div className="space-y-2">
        {/* Video Container */}
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group">
          {videoLoading && <VideoPreviewSkeleton />}

          {videoError ? (
            <ErrorMessage
              title="Video Load Error"
              message="Failed to load video. The file may be corrupted or unavailable."
              onRetry={onRetry}
            />
          ) : (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full"
                poster={thumbnailUrl}
                onClick={togglePlayPause}
                aria-label="Video player"
              >
                Your browser does not support the video tag.
              </video>

              {/* Play/Pause Overlay */}
              {!videoLoading && (
                <button
                  onClick={togglePlayPause}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={isPlaying ? 'Pause video' : 'Play video'}
                >
                  {!isPlaying && (
                    <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-gray-900 ml-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                </button>
              )}

              {/* Video Controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <div className="flex items-center gap-2">
                  {/* Play/Pause Button */}
                  <button
                    onClick={togglePlayPause}
                    className="text-white hover:text-gray-300 transition-colors"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  >
                    {isPlaying ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  {/* Volume Control */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={toggleMute}
                      className="text-white hover:text-gray-300 transition-colors"
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                      title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                    >
                      {isMuted || volume === 0 ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                        </svg>
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                      aria-label="Volume"
                      title="Volume"
                    />
                  </div>

                  <div className="flex-1" />

                  {/* Playback Speed */}
                  <select
                    value={playbackSpeed}
                    onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                    className="bg-white/10 text-white text-xs px-2 py-1 rounded border border-white/20 cursor-pointer hover:bg-white/20 transition-colors"
                    aria-label="Playback speed"
                    title="Playback speed"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>

                  {/* Fullscreen Button */}
                  <button
                    onClick={toggleFullscreen}
                    className="text-white hover:text-gray-300 transition-colors"
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
                  >
                    {isFullscreen ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Keyboard Shortcuts Hint */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/70 text-white text-xs px-2 py-1 rounded" role="status">
                  <span className="sr-only">Keyboard shortcuts available</span>
                  Space: Play/Pause | F: Fullscreen | M: Mute | Arrows: Seek
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            aria-label={isDownloading ? 'Downloading video' : 'Download video'}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {isDownloading ? 'Downloading...' : 'Download'}
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-label="Share video"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            Share
          </button>
        </div>

        {downloadError && (
          <p className="text-xs text-red-600 dark:text-red-400 text-center" role="alert">
            {downloadError}
          </p>
        )}
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <ErrorMessage
        title="Video Generation Failed"
        message={error || 'An error occurred during video generation. Please try again.'}
        onRetry={onRetry}
        variant="error"
      />
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

  // Pending state - no video yet
  return <NoVideoYet />;
}
