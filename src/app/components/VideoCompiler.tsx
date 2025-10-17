'use client';

import { useState, useMemo } from 'react';
import { Scene } from '@/lib/types';

interface VideoCompilerProps {
  scenes: Scene[];
  storyboardId: string;
}

interface CompilationResult {
  videoUrl: string;
  fileSizeBytes: number;
  durationSeconds: number;
  scenesCompiled: number;
}

export default function VideoCompiler({ scenes, storyboardId }: VideoCompilerProps) {
  const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(new Set());
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationProgress, setCompilationProgress] = useState(0);
  const [compiledVideo, setCompiledVideo] = useState<CompilationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter scenes that have completed videos
  const completedScenes = useMemo(() => {
    return scenes.filter(scene =>
      scene.videoJob?.status === 'completed' && scene.videoJob?.videoUrl
    );
  }, [scenes]);

  // Calculate estimated file size and duration for selected scenes
  const estimatedStats = useMemo(() => {
    const selected = completedScenes.filter(scene => selectedSceneIds.has(scene.id));
    const duration = selected.reduce((sum, scene) => sum + scene.duration, 0);
    // Rough estimate: 1MB per second of video at 720p
    const estimatedSize = duration * 1024 * 1024;
    return { duration, estimatedSize };
  }, [completedScenes, selectedSceneIds]);

  // Toggle scene selection
  const toggleSceneSelection = (sceneId: string) => {
    setSelectedSceneIds(prev => {
      const next = new Set(prev);
      if (next.has(sceneId)) {
        next.delete(sceneId);
      } else {
        next.add(sceneId);
      }
      return next;
    });
  };

  // Select all completed scenes
  const selectAll = () => {
    setSelectedSceneIds(new Set(completedScenes.map(s => s.id)));
  };

  // Deselect all scenes
  const deselectAll = () => {
    setSelectedSceneIds(new Set());
  };

  // Format bytes to human-readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format duration to MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Compile selected scenes
  const compileVideos = async () => {
    if (selectedSceneIds.size < 2) {
      setError('Please select at least 2 scenes to compile');
      return;
    }

    setIsCompiling(true);
    setCompilationProgress(0);
    setError(null);
    setCompiledVideo(null);

    try {
      // Get video URLs in scene order
      const sceneVideoUrls = completedScenes
        .filter(scene => selectedSceneIds.has(scene.id))
        .map(scene => scene.videoJob!.videoUrl!);

      // Simulate progress updates (actual compilation happens on server)
      const progressInterval = setInterval(() => {
        setCompilationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      // Call compilation API
      const response = await fetch('/api/video/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneVideoUrls,
          storyboardId,
        }),
      });

      clearInterval(progressInterval);
      setCompilationProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Compilation failed');
      }

      setCompiledVideo(data);
      console.log('Video compiled successfully:', data);

    } catch (err: any) {
      console.error('Compilation error:', err);
      setError(err.message || 'Failed to compile videos');
    } finally {
      setIsCompiling(false);
    }
  };

  // Download compiled video
  const downloadVideo = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download video');
    }
  };

  // Don't show if less than 2 completed scenes
  if (completedScenes.length < 2) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Video Compiler</h3>

      {/* Scene Selection */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Select Scenes to Compile</span>
          <div className="space-x-2">
            <button
              onClick={selectAll}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="text-xs text-gray-600 hover:text-gray-800"
            >
              Deselect All
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {completedScenes.map((scene, index) => (
            <label
              key={scene.id}
              className="flex items-center p-2 bg-gray-50 dark:bg-gray-900 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <input
                type="checkbox"
                checked={selectedSceneIds.has(scene.id)}
                onChange={() => toggleSceneSelection(scene.id)}
                className="mr-3"
              />
              <div className="flex-1">
                <div className="text-sm font-medium">Scene {index + 1}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {scene.subject}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {scene.duration}s
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Estimated Stats */}
      {selectedSceneIds.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Selected Scenes:</span>
              <span className="font-medium">{selectedSceneIds.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Duration:</span>
              <span className="font-medium">{formatDuration(estimatedStats.duration)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Est. File Size:</span>
              <span className="font-medium">{formatBytes(estimatedStats.estimatedSize)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Compilation Progress */}
      {isCompiling && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Compiling videos...</span>
            <span>{compilationProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${compilationProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Compiled Video Result */}
      {compiledVideo && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center text-green-800 dark:text-green-200">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Compilation Complete!</span>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-3">
            <div className="flex justify-between">
              <span>Scenes Compiled:</span>
              <span className="font-medium">{compiledVideo.scenesCompiled}</span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span className="font-medium">{formatDuration(compiledVideo.durationSeconds)}</span>
            </div>
            <div className="flex justify-between">
              <span>File Size:</span>
              <span className="font-medium">{formatBytes(compiledVideo.fileSizeBytes)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => downloadVideo(compiledVideo.videoUrl, `storyboard-${storyboardId}.mp4`)}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
            >
              Download Video
            </button>
            <a
              href={compiledVideo.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
            >
              Open
            </a>
          </div>
        </div>
      )}

      {/* Compile Button */}
      <button
        onClick={compileVideos}
        disabled={isCompiling || selectedSceneIds.size < 2}
        className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {isCompiling ? 'Compiling...' : `Compile ${selectedSceneIds.size} Selected Scenes`}
      </button>
    </div>
  );
}
