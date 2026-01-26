'use client';

import { useEffect, useState } from 'react';
import { SceneEditor } from './SceneEditor';
import { sceneOps } from '../db/operations';
import { useEditorStore } from '../stores/editorStore';
import type { Scene } from '../db';

interface SceneCardProps {
  scene: Scene;
  onUpdate: () => void;
}

export function SceneCard({ scene, onUpdate }: SceneCardProps) {
  const { selectedSceneId, setSelectedSceneId } = useEditorStore();
  const [title, setTitle] = useState(scene.title);
  const [content, setContent] = useState(scene.content);
  const isSelected = selectedSceneId === scene.id;

  // Auto-save title
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (title !== scene.title) {
        await sceneOps.update(scene.id!, { title });
        onUpdate();
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [title, scene.title, scene.id, onUpdate]);

  // Auto-save content
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (content !== scene.content) {
        await sceneOps.updateContent(scene.id!, content);
        onUpdate();
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [content, scene.content, scene.id, onUpdate]);

  const handleClick = () => {
    setSelectedSceneId(scene.id!);
  };

  return (
    <div
      id={`scene-${scene.id}`}
      onClick={handleClick}
      className={`rounded-lg border bg-white transition-all dark:bg-zinc-900 ${
        isSelected
          ? 'border-zinc-400 shadow-md dark:border-zinc-600'
          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
      }`}
    >
      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border-b border-zinc-200 bg-transparent px-4 py-3 text-lg font-semibold text-zinc-900 focus:outline-none dark:border-zinc-800 dark:text-zinc-50"
        placeholder="씬 제목"
      />

      {/* Editor */}
      <div className="min-h-[200px]">
        <SceneEditor
          content={content}
          onChange={setContent}
          placeholder="씬 내용을 작성하세요..."
        />
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800">
        {scene.characters.length > 0 && (
          <span>등장인물: {scene.characters.join(', ')}</span>
        )}
      </div>
    </div>
  );
}
