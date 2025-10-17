'use client';

import { Scene } from '@/lib/types';
import VideoPreview from './VideoPreview';

interface SceneEditorProps {
  scene: Scene;
  sceneIndex: number;
  onChange: (scene: Scene) => void;
  onDelete: () => void;
  onGenerate?: () => void;
  onDuplicate?: () => void;
}

export default function SceneEditor({
  scene,
  sceneIndex,
  onChange,
  onDelete,
  onGenerate,
  onDuplicate
}: SceneEditorProps) {
  const handleInputChange = (field: keyof Scene, value: any) => {
    onChange({ ...scene, [field]: value });
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow mb-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-md font-semibold" id={`scene-${scene.id}-heading`}>
          Scene {sceneIndex + 1}
        </h4>
        <div className="flex gap-2">
          {onDuplicate && (
            <button
              onClick={onDuplicate}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
              title="Duplicate scene"
              aria-label={`Duplicate scene ${sceneIndex + 1}`}
            >
              Duplicate
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-2 py-1"
            aria-label={`Delete scene ${sceneIndex + 1}`}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-4">
          <div>
            <label
              htmlFor={`scene-${scene.id}-subject`}
              className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
            >
              Subject
            </label>
            <input
              id={`scene-${scene.id}-subject`}
              type="text"
              value={scene.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="A woman walking through a city"
              aria-describedby={`scene-${scene.id}-subject-hint`}
            />
            <span id={`scene-${scene.id}-subject-hint`} className="sr-only">
              Describe the main subject of this scene
            </span>
          </div>

          <div>
            <label
              htmlFor={`scene-${scene.id}-action`}
              className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
            >
              Action
            </label>
            <textarea
              id={`scene-${scene.id}-action`}
              value={scene.action}
              onChange={(e) => handleInputChange('action', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-y"
              rows={3}
              placeholder="She stops to look at a window display, smiles, then continues walking"
              aria-describedby={`scene-${scene.id}-action-hint`}
            />
            <span id={`scene-${scene.id}-action-hint`} className="sr-only">
              Describe what happens in this scene
            </span>
          </div>

          <div>
            <label
              htmlFor={`scene-${scene.id}-duration`}
              className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
            >
              Duration (seconds)
            </label>
            <select
              id={`scene-${scene.id}-duration`}
              value={scene.duration}
              onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              aria-label="Scene duration in seconds"
            >
              <option value={4}>4 seconds</option>
              <option value={8}>8 seconds</option>
              <option value={12}>12 seconds</option>
            </select>
          </div>

          {scene.videoJob && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Video Status:</span>
                <span className={`text-sm px-2 py-1 rounded ${
                  scene.videoJob.status === 'completed' ? 'bg-green-100 text-green-800' :
                  scene.videoJob.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {scene.videoJob.status}
                </span>
              </div>
              {scene.videoJob.cost && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Cost: ${scene.videoJob.cost.toFixed(2)}
                </div>
              )}
            </div>
          )}

          {onGenerate && (
            <button
              onClick={onGenerate}
              disabled={scene.videoJob?.status === 'processing'}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label={
                scene.videoJob?.status === 'processing'
                  ? 'Generating video...'
                  : 'Generate video for this scene'
              }
              aria-busy={scene.videoJob?.status === 'processing'}
            >
              {scene.videoJob?.status === 'processing' ? 'Generating...' : 'Generate Video'}
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Video Preview
          </label>
          <VideoPreview
            videoUrl={scene.videoJob?.videoUrl}
            thumbnailUrl={scene.videoJob?.thumbnailUrl}
            status={scene.videoJob?.status || 'pending'}
            progress={scene.videoJob?.progress}
            error={scene.videoJob?.errorMessage}
            sceneId={scene.id}
            onRetry={onGenerate}
          />
        </div>
      </div>
    </div>
  );
}
