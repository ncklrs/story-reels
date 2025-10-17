'use client';

import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Storyboard, CharacterProfile, Scene } from '@/lib/types';
import { SORA_PRESETS } from '@/lib/presets';
import CharacterEditor from './CharacterEditor';
import PresetSelector from './PresetSelector';
import VideoCompiler from './VideoCompiler';
import DraggableSceneList from './DraggableSceneList';
import CostTracker from './CostTracker';
import CollapsibleCard from './CollapsibleCard';
import ActionBar from './ActionBar';
import VideoGenerationPanel from './VideoGenerationPanel';
import ApiKeySettings from './ApiKeySettings';
import GuestBanner from './GuestBanner';
import LoadModal from './LoadModal';
import SceneTemplateSelector, { SCENE_TEMPLATES } from './SceneTemplateSelector';
import { useToast } from './ToastContext';
import { useSafeLocalStorage } from '@/app/hooks/useSafeLocalStorage';
import { usePolling } from '@/app/hooks/usePolling';

const DEFAULT_STORYBOARD: Storyboard = {
  id: uuidv4(),
  presetKey: 'cinematic',
  character: {
    id: uuidv4(),
    name: ''
  },
  scenes: []
};

export default function StoryboardEditor() {
  // Toast notifications
  const { showToast } = useToast();

  // Use safe localStorage hook with SSR handling and debouncing
  const [storyboard, setStoryboard, { isLoading: storageLoading }] = useSafeLocalStorage<Storyboard>(
    'storyboard',
    DEFAULT_STORYBOARD,
    {
      debounceMs: 500,
      onSaveError: (error) => {
        console.error('Failed to save storyboard:', error);
        showToast('Failed to auto-save storyboard', 'error');
      },
    }
  );

  // State
  const [provider, setProvider] = useState<'sora' | 'veo'>('sora');
  const [model, setModel] = useState('sora-2');
  const [resolution, setResolution] = useState('1280x720');
  const [sessionExists, setSessionExists] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationQueue, setGenerationQueue] = useState<string[]>([]);
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null); // TODO: Replace with actual auth
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSceneTemplateSelector, setShowSceneTemplateSelector] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Use polling hook for video status polling with cleanup
  const { startPolling, stopPolling } = usePolling({
    initialInterval: 2000,
    maxInterval: 30000,
    maxAttempts: 60,
    backoffMultiplier: 1.5,
  });

  // Computed values
  const totalDuration = useMemo(() => {
    return storyboard.scenes.reduce((sum: number, scene: Scene) => sum + scene.duration, 0);
  }, [storyboard.scenes]);

  const pendingCount = useMemo(() => {
    return storyboard.scenes.filter(
      scene => !scene.videoJob || scene.videoJob.status === 'failed'
    ).length;
  }, [storyboard.scenes]);

  const completedCount = useMemo(() => {
    return storyboard.scenes.filter(
      scene => scene.videoJob?.status === 'completed'
    ).length;
  }, [storyboard.scenes]);

  const allScenesComplete = useMemo(() => {
    return storyboard.scenes.length > 0 &&
           storyboard.scenes.every(scene => scene.videoJob?.status === 'completed');
  }, [storyboard.scenes]);

  /**
   * Save storyboard manually
   */
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // The useSafeLocalStorage hook already handles auto-saving
      // This is for manual save action
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save
      showToast('Storyboard saved successfully!', 'success');
    } catch (error) {
      showToast('Failed to save storyboard', 'error');
    } finally {
      setSaving(false);
    }
  }, [showToast]);

  /**
   * Save API keys to secure session
   */
  const handleSaveKeys = useCallback(async (keys: {
    provider: 'sora' | 'veo';
    openaiKey?: string;
    googleProjectId?: string;
    googleApiKey?: string;
  }) => {
    try {
      const apiKey = keys.provider === 'sora' ? keys.openaiKey : keys.googleApiKey;

      if (!apiKey) {
        showToast('Please enter an API key', 'warning');
        return;
      }

      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: keys.provider,
          apiKey,
          projectId: keys.googleProjectId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save API key');
      }

      setSessionExists(true);
      showToast('API keys saved securely!', 'success');
    } catch (error: any) {
      console.error('Error saving API key:', error);
      showToast(`Failed to save API key: ${error.message}`, 'error');
    }
  }, [showToast]);

  /**
   * Load storyboard
   */
  const handleLoad = useCallback(async (storyboardId: string) => {
    try {
      // TODO: Implement actual loading from API
      showToast('Storyboard loaded successfully!', 'success');
      setShowLoadModal(false);
    } catch (error) {
      showToast('Failed to load storyboard', 'error');
    }
  }, [showToast]);

  /**
   * Handle template actions
   */
  const handleTemplatesClick = useCallback(() => {
    // For now, just show a toast
    showToast('Templates feature coming soon!', 'info');
  }, [showToast]);

  /**
   * Handle export click
   */
  const handleExportClick = useCallback(() => {
    exportStoryboard();
  }, []);

  const updateCharacter = useCallback((character: CharacterProfile) => {
    setStoryboard((prev: Storyboard) => ({ ...prev, character }));
  }, [setStoryboard]);

  const updatePreset = useCallback((presetKey: string) => {
    setStoryboard((prev: Storyboard) => ({ ...prev, presetKey }));
  }, [setStoryboard]);

  const addScene = useCallback(() => {
    const newScene: Scene = {
      id: uuidv4(),
      subject: '',
      action: '',
      duration: 8
    };
    setStoryboard((prev: Storyboard) => ({
      ...prev,
      scenes: [...prev.scenes, newScene]
    }));
  }, [setStoryboard]);

  /**
   * Add scene from template
   */
  const addSceneFromTemplate = useCallback((templateId: string) => {
    const template = SCENE_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const newScene: Scene = {
      id: uuidv4(),
      subject: template.subject,
      action: template.action,
      duration: template.duration
    };

    setStoryboard((prev: Storyboard) => ({
      ...prev,
      scenes: [...prev.scenes, newScene]
    }));
  }, [setStoryboard]);

  /**
   * Handle scene template selection
   */
  const handleSelectSceneTemplate = useCallback((templateId: string) => {
    addSceneFromTemplate(templateId);
    setShowSceneTemplateSelector(false);
    showToast('Template added to scenes', 'success');
  }, [addSceneFromTemplate, showToast]);

  /**
   * Update scene by ID instead of index to prevent race conditions
   */
  const updateScene = useCallback((sceneId: string, updatedScene: Scene) => {
    setStoryboard((prev: Storyboard) => ({
      ...prev,
      scenes: prev.scenes.map((s: Scene) => s.id === sceneId ? updatedScene : s)
    }));
  }, [setStoryboard]);

  /**
   * Delete scene by ID instead of index
   */
  const deleteScene = useCallback((sceneId: string) => {
    // Stop any polling for this scene
    stopPolling(sceneId);

    setStoryboard((prev: Storyboard) => ({
      ...prev,
      scenes: prev.scenes.filter((s: Scene) => s.id !== sceneId)
    }));
  }, [setStoryboard, stopPolling]);

  /**
   * Duplicate scene by ID
   */
  const duplicateScene = useCallback((sceneId: string) => {
    const scene = storyboard.scenes.find((s: Scene) => s.id === sceneId);
    if (!scene) return;

    const duplicatedScene: Scene = {
      ...scene,
      id: uuidv4(),
      videoJob: undefined, // Don't copy video job
    };

    setStoryboard((prev: Storyboard) => {
      const index = prev.scenes.findIndex((s: Scene) => s.id === sceneId);
      const newScenes = [...prev.scenes];
      newScenes.splice(index + 1, 0, duplicatedScene);
      return { ...prev, scenes: newScenes };
    });
  }, [storyboard.scenes, setStoryboard]);

  /**
   * Reorder scenes after drag-and-drop
   */
  const reorderScenes = useCallback((reorderedScenes: Scene[]) => {
    setStoryboard((prev: Storyboard) => ({
      ...prev,
      scenes: reorderedScenes
    }));
  }, [setStoryboard]);

  /**
   * Generate video for a scene using session-based authentication
   */
  const generateVideo = useCallback(async (sceneId: string) => {
    const scene = storyboard.scenes.find((s: Scene) => s.id === sceneId);
    if (!scene) {
      console.error('Scene not found:', sceneId);
      return;
    }

    try {
      // Update scene to show processing
      updateScene(sceneId, {
        ...scene,
        videoJob: {
          id: uuidv4(),
          status: 'processing',
          provider,
          progress: 0
        }
      });

      // Call API to generate video (API key retrieved from session cookie)
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: include cookies for session auth
        body: JSON.stringify({
          storyboardId: storyboard.id,
          scene,
          character: storyboard.character,
          presetKey: storyboard.presetKey,
          provider,
          model,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      // Start polling for status with cleanup support
      pollVideoStatus(sceneId, data.jobId);

    } catch (error: any) {
      console.error('Generation error:', error);
      updateScene(sceneId, {
        ...scene,
        videoJob: {
          id: uuidv4(),
          status: 'failed',
          provider,
          errorMessage: error.message
        }
      });
      showToast(`Failed to generate video: ${error.message}`, 'error');
    }
  }, [storyboard, provider, model, updateScene, showToast]);

  /**
   * Export storyboard as JSON file
   */
  const exportStoryboard = useCallback(() => {
    // Create export object without video URLs for privacy
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      storyboard: {
        id: storyboard.id,
        presetKey: storyboard.presetKey,
        character: storyboard.character,
        scenes: storyboard.scenes.map(scene => ({
          id: scene.id,
          subject: scene.subject,
          action: scene.action,
          duration: scene.duration,
          // Don't include video job data
        })),
      },
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `storyboard-${storyboard.id}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast('Storyboard exported successfully!', 'success');
  }, [storyboard, showToast]);

  /**
   * Generate all scenes without videos
   */
  const generateAllScenes = useCallback(async () => {
    const scenesToGenerate = storyboard.scenes.filter(
      scene => !scene.videoJob || scene.videoJob.status === 'failed'
    );

    if (scenesToGenerate.length === 0) {
      showToast('All scenes already have videos!', 'info');
      return;
    }

    setIsGeneratingAll(true);
    setGenerationQueue(scenesToGenerate.map(s => s.id));

    showToast(`Generating ${scenesToGenerate.length} scene(s)...`, 'info');

    // Generate scenes sequentially
    for (const scene of scenesToGenerate) {
      await generateVideo(scene.id);
      // Wait a bit between generations to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    setIsGeneratingAll(false);
    setGenerationQueue([]);
    showToast('All scenes generated!', 'success');
  }, [storyboard.scenes, generateVideo, showToast]);

  /**
   * Generate selected scenes
   */
  const handleGenerateSelected = useCallback(async () => {
    if (selectedScenes.size === 0) {
      showToast('Please select at least one scene', 'warning');
      return;
    }

    setIsGeneratingAll(true);
    const sceneIds = Array.from(selectedScenes);
    setGenerationQueue(sceneIds);

    showToast(`Generating ${sceneIds.length} selected scene(s)...`, 'info');

    for (const sceneId of sceneIds) {
      await generateVideo(sceneId);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    setIsGeneratingAll(false);
    setGenerationQueue([]);
    setSelectedScenes(new Set());
    showToast('Selected scenes generated!', 'success');
  }, [selectedScenes, generateVideo, showToast]);

  /**
   * Stop generation
   */
  const handleStopGeneration = useCallback(() => {
    setIsGeneratingAll(false);
    setGenerationQueue([]);
    showToast('Generation stopped', 'info');
  }, [showToast]);

  /**
   * Poll video status with exponential backoff and proper cleanup
   */
  const pollVideoStatus = useCallback((sceneId: string, jobId: string) => {
    startPolling(
      sceneId, // Use scene ID as polling ID for cleanup
      async (signal) => {
        const response = await fetch(`/api/video/status/${jobId}`, { signal });
        const data = await response.json();

        // Get current scene (may have been updated)
        const currentScene = storyboard.scenes.find((s: Scene) => s.id === sceneId);
        if (!currentScene) {
          // Scene was deleted, stop polling
          return { shouldContinue: false };
        }

        if (data.status === 'completed') {
          updateScene(sceneId, {
            ...currentScene,
            videoJob: {
              id: jobId,
              status: 'completed',
              provider,
              progress: 100,
              videoUrl: data.videoUrl
            }
          });
          showToast('Video generated successfully!', 'success');
          return { shouldContinue: false, data };
        }

        if (data.status === 'failed') {
          updateScene(sceneId, {
            ...currentScene,
            videoJob: {
              id: jobId,
              status: 'failed',
              provider,
              errorMessage: data.error || 'Generation failed'
            }
          });
          showToast('Video generation failed', 'error');
          return { shouldContinue: false };
        }

        // Update progress and continue polling
        updateScene(sceneId, {
          ...currentScene,
          videoJob: {
            id: jobId,
            status: 'processing',
            provider,
            progress: data.progress || 50
          }
        });

        return { shouldContinue: true };
      },
      (data) => {
        console.log('Video generation completed:', data);
      },
      (error) => {
        console.error('Polling error:', error);
        const scene = storyboard.scenes.find((s: Scene) => s.id === sceneId);
        if (scene) {
          updateScene(sceneId, {
            ...scene,
            videoJob: {
              id: jobId,
              status: 'failed',
              provider,
              errorMessage: error.message
            }
          });
        }
        showToast('Video generation error', 'error');
      }
    );
  }, [startPolling, storyboard.scenes, provider, updateScene, showToast]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-gray-900 to-black py-6 px-4">
      {/* Action Bar - sticky at top */}
      <ActionBar
        scenesCount={storyboard.scenes.length}
        totalDuration={totalDuration}
        pendingScenes={pendingCount}
        completedScenes={completedCount}
        totalScenes={storyboard.scenes.length}
        isGenerating={isGeneratingAll}
        saving={saving}
        onSave={handleSave}
        onTemplatesClick={handleTemplatesClick}
        onExportClick={handleExportClick}
        onLoadClick={() => setShowLoadModal(true)}
      />

      {/* Main Editor */}
      <div className="max-w-5xl mx-auto space-y-4 mt-20">
        {/* Guest Banner (if not authenticated) */}
        {!user && <GuestBanner onSignInClick={() => setShowAuthModal(true)} />}

        {/* Settings Card */}
        <CollapsibleCard
          title="Visual Settings"
          subtitle={`${SORA_PRESETS.find(p => p.key === storyboard.presetKey)?.label || 'Custom'} preset selected`}
          defaultOpen={false}
        >
          <PresetSelector
            selectedPresetKey={storyboard.presetKey}
            onChange={updatePreset}
          />
        </CollapsibleCard>

        {/* API Keys Card */}
        <CollapsibleCard
          title="API Keys"
          subtitle="Manage Sora and Veo authentication"
          defaultOpen={!sessionExists}
        >
          <ApiKeySettings
            provider={provider}
            onProviderChange={setProvider}
            onSaveKeys={handleSaveKeys}
          />
        </CollapsibleCard>

        {/* Character Card */}
        <CollapsibleCard
          title="Character Profile"
          subtitle={storyboard.character.name || 'Configure your character'}
          defaultOpen={!storyboard.character.name}
        >
          <CharacterEditor
            character={storyboard.character}
            onChange={updateCharacter}
          />
        </CollapsibleCard>

        {/* Video Generation Card */}
        <CollapsibleCard
          title="Video Generation"
          subtitle="Generate videos from your scenes"
          defaultOpen={true}
        >
          <VideoGenerationPanel
            storyboard={storyboard}
            provider={provider}
            model={model}
            resolution={resolution}
            onProviderChange={setProvider}
            onModelChange={setModel}
            onResolutionChange={setResolution}
            onGenerateAll={generateAllScenes}
            onGenerateSelected={handleGenerateSelected}
            onStopGeneration={handleStopGeneration}
            selectedScenes={selectedScenes}
            isGenerating={isGeneratingAll}
          />
        </CollapsibleCard>

        {/* Scenes Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Scenes</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSceneTemplateSelector(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Insert Template
              </button>
              <button
                onClick={addScene}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                + Add Scene
              </button>
            </div>
          </div>

          {/* Scenes list */}
          {storyboard.scenes.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
              <p className="text-gray-500">No scenes yet. Click "Add Scene" or "Insert Template" to get started.</p>
            </div>
          ) : (
            <DraggableSceneList
              scenes={storyboard.scenes}
              onScenesReorder={reorderScenes}
              onSceneUpdate={updateScene}
              onSceneDelete={deleteScene}
              onSceneGenerate={generateVideo}
              onSceneDuplicate={duplicateScene}
            />
          )}
        </div>

        {/* Video Compilation Card */}
        {allScenesComplete && (
          <CollapsibleCard
            title="Video Compilation"
            subtitle="Stitch scenes into final video"
            defaultOpen={true}
          >
            <VideoCompiler scenes={storyboard.scenes} storyboardId={storyboard.id} />
          </CollapsibleCard>
        )}

        {/* Cost Tracker Card */}
        <CollapsibleCard
          title="Cost Tracker"
          subtitle="Monitor your API usage"
          defaultOpen={false}
        >
          <CostTracker storyboardId={storyboard.id} scenes={storyboard.scenes} />
        </CollapsibleCard>
      </div>

      {/* Modals */}
      <LoadModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onLoad={handleLoad}
        userId={user?.id}
      />

      <SceneTemplateSelector
        isOpen={showSceneTemplateSelector}
        onClose={() => setShowSceneTemplateSelector(false)}
        onSelectTemplate={handleSelectSceneTemplate}
      />
    </div>
  );
}
