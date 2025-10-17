'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Scene } from '@/lib/types';
import SceneEditor from './SceneEditor';

interface DraggableSceneListProps {
  scenes: Scene[];
  onScenesReorder: (scenes: Scene[]) => void;
  onSceneUpdate: (sceneId: string, updatedScene: Scene) => void;
  onSceneDelete: (sceneId: string) => void;
  onSceneGenerate: (sceneId: string) => void;
  onSceneDuplicate?: (sceneId: string) => void;
}

/**
 * Wrapper component for individual sortable scene
 */
function SortableSceneItem({
  scene,
  sceneIndex,
  onUpdate,
  onDelete,
  onGenerate,
  onDuplicate,
}: {
  scene: Scene;
  sceneIndex: number;
  onUpdate: (scene: Scene) => void;
  onDelete: () => void;
  onGenerate: () => void;
  onDuplicate?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-8 top-6 cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded"
        title="Drag to reorder"
      >
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>

      {/* Scene Editor */}
      <SceneEditor
        scene={scene}
        sceneIndex={sceneIndex}
        onChange={onUpdate}
        onDelete={onDelete}
        onGenerate={onGenerate}
        onDuplicate={onDuplicate}
      />
    </div>
  );
}

/**
 * DraggableSceneList - Enables drag-and-drop reordering of scenes
 */
export default function DraggableSceneList({
  scenes,
  onScenesReorder,
  onSceneUpdate,
  onSceneDelete,
  onSceneGenerate,
  onSceneDuplicate,
}: DraggableSceneListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure sensors for drag interaction
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end - reorder scenes
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = scenes.findIndex(scene => scene.id === active.id);
      const newIndex = scenes.findIndex(scene => scene.id === over.id);

      const reorderedScenes = arrayMove(scenes, oldIndex, newIndex);
      onScenesReorder(reorderedScenes);
    }

    setActiveId(null);
  };

  // Get the currently dragged scene
  const activeScene = activeId ? scenes.find(scene => scene.id === activeId) : null;
  const activeSceneIndex = activeScene
    ? scenes.findIndex(scene => scene.id === activeId)
    : -1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={scenes.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4 pl-8">
          {scenes.map((scene, index) => (
            <SortableSceneItem
              key={scene.id}
              scene={scene}
              sceneIndex={index}
              onUpdate={(updated) => onSceneUpdate(scene.id, updated)}
              onDelete={() => onSceneDelete(scene.id)}
              onGenerate={() => onSceneGenerate(scene.id)}
              onDuplicate={onSceneDuplicate ? () => onSceneDuplicate(scene.id) : undefined}
            />
          ))}
        </div>
      </SortableContext>

      {/* Drag Overlay - Shows preview while dragging */}
      <DragOverlay>
        {activeScene ? (
          <div className="opacity-90">
            <SceneEditor
              scene={activeScene}
              sceneIndex={activeSceneIndex}
              onChange={() => {}}
              onDelete={() => {}}
              onGenerate={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
