'use client';

import { Storyboard } from '@/lib/types';
import { useState, useMemo } from 'react';

interface VideoGenerationPanelProps {
  storyboard: Storyboard;
  provider: 'sora' | 'veo';
  model: string;
  resolution?: string;
  onProviderChange: (provider: 'sora' | 'veo') => void;
  onModelChange: (model: string) => void;
  onResolutionChange?: (resolution: string) => void;
  onGenerateAll: () => void;
  onGenerateSelected: () => void;
  onStopGeneration: () => void;
  selectedScenes: Set<string>;
  isGenerating: boolean;
}

const SORA_MODELS = [
  { value: 'sora-2', label: 'Sora 2 Standard', costPerSec: 0.10 },
  { value: 'sora-2-pro', label: 'Sora 2 Pro', costPerSec: 0.20 },
];

const VEO_MODELS = [
  { value: 'veo-3.1-generate-preview', label: 'Veo 3.1', costPer10Sec: 0.15 },
  { value: 'veo-3.1-fast-generate-preview', label: 'Veo 3.1 Fast', costPer10Sec: 0.10 },
];

const SORA_RESOLUTIONS = {
  all: ['1280x720', '720x1280'],
  pro: ['1792x1024', '1024x1792'],
};

export default function VideoGenerationPanel({
  storyboard,
  provider,
  model,
  resolution,
  onProviderChange,
  onModelChange,
  onResolutionChange,
  onGenerateAll,
  onGenerateSelected,
  onStopGeneration,
  selectedScenes,
  isGenerating,
}: VideoGenerationPanelProps) {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  // Get available models based on provider
  const availableModels = provider === 'sora' ? SORA_MODELS : VEO_MODELS;

  // Get available resolutions for Sora
  const availableResolutions = useMemo(() => {
    if (provider !== 'sora') return [];
    const baseResolutions = SORA_RESOLUTIONS.all;
    if (model === 'sora-2-pro') {
      return [...baseResolutions, ...SORA_RESOLUTIONS.pro];
    }
    return baseResolutions;
  }, [provider, model]);

  // Calculate cost estimate
  const costEstimate = useMemo(() => {
    const pendingScenes = storyboard.scenes.filter(
      scene => !scene.videoJob || scene.videoJob.status !== 'completed'
    );

    if (pendingScenes.length === 0) return 0;

    const totalSeconds = pendingScenes.reduce((sum, scene) => sum + scene.duration, 0);

    if (provider === 'sora') {
      const modelData = SORA_MODELS.find(m => m.value === model);
      return totalSeconds * (modelData?.costPerSec || 0.10);
    } else {
      const modelData = VEO_MODELS.find(m => m.value === model);
      return (totalSeconds / 10) * (modelData?.costPer10Sec || 0.15);
    }
  }, [storyboard.scenes, provider, model]);

  const pendingScenesCount = storyboard.scenes.filter(
    scene => !scene.videoJob || scene.videoJob.status !== 'completed'
  ).length;

  const hasScenes = storyboard.scenes.length > 0;
  const hasSelection = selectedScenes.size > 0;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Video Generation</h3>

      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Video Provider
        </label>
        <select
          value={provider}
          onChange={(e) => onProviderChange(e.target.value as 'sora' | 'veo')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isGenerating}
        >
          <option value="sora">OpenAI Sora 2</option>
          <option value="veo">Google Veo 3.1</option>
        </select>
      </div>

      {/* Model Selection */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Model Quality
        </label>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isGenerating}
        >
          {availableModels.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label} (${provider === 'sora' ? 'costPerSec' in m ? `${m.costPerSec}/sec` : '' : 'costPer10Sec' in m ? `${m.costPer10Sec}/10sec` : ''})
            </option>
          ))}
        </select>
      </div>

      {/* Resolution Selection (Sora only) */}
      {provider === 'sora' && onResolutionChange && (
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Resolution
          </label>
          <select
            value={resolution || '1280x720'}
            onChange={(e) => onResolutionChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isGenerating}
          >
            {availableResolutions.map((res) => (
              <option key={res} value={res}>
                {res} {SORA_RESOLUTIONS.pro.includes(res) ? '(Pro only)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Cost Estimate */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Estimated Cost
            </span>
          </div>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
            ${costEstimate.toFixed(2)}
          </span>
        </div>
        <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
          {pendingScenesCount} pending scene{pendingScenesCount !== 1 ? 's' : ''} • {storyboard.scenes.reduce((sum, s) => sum + s.duration, 0)}s total
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {!isGenerating ? (
          <>
            <button
              onClick={onGenerateAll}
              disabled={!hasScenes}
              onMouseEnter={() => setHoveredButton('all')}
              onMouseLeave={() => setHoveredButton(null)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                hasScenes
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
              aria-label="Generate all scenes"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Generate All Scenes
            </button>

            <button
              onClick={onGenerateSelected}
              disabled={!hasSelection}
              onMouseEnter={() => setHoveredButton('selected')}
              onMouseLeave={() => setHoveredButton(null)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                hasSelection
                  ? 'bg-gray-600 hover:bg-gray-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
              aria-label="Generate selected scenes"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Generate Selected ({selectedScenes.size})
            </button>
          </>
        ) : (
          <button
            onClick={onStopGeneration}
            onMouseEnter={() => setHoveredButton('stop')}
            onMouseLeave={() => setHoveredButton(null)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
            aria-label="Stop generation"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Stop Generation
          </button>
        )}
      </div>
    </div>
  );
}
