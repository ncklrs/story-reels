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
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-md font-semibold">Scene {sceneIndex + 1}</h4>
        <div className="flex gap-2">
          {onDuplicate && (
            <button
              onClick={onDuplicate}
              className="text-blue-600 hover:text-blue-800 text-sm"
              title="Duplicate scene"
            >
              Duplicate
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input
              type="text"
              value={scene.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="A woman walking through a city"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Action</label>
            <textarea
              value={scene.action}
              onChange={(e) => handleInputChange('action', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
              placeholder="She stops to look at a window display, smiles, then continues walking"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Duration (seconds)</label>
            <select
              value={scene.duration}
              onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
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
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scene.videoJob?.status === 'processing' ? 'Generating...' : 'Generate Video'}
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Video Preview</label>
          <VideoPreview
            videoUrl={scene.videoJob?.videoUrl}
            thumbnailUrl={scene.videoJob?.thumbnailUrl}
            status={scene.videoJob?.status || 'pending'}
            progress={scene.videoJob?.progress}
            error={scene.videoJob?.errorMessage}
            sceneId={scene.id}
          />
        </div>
      </div>
    </div>
  );
}
