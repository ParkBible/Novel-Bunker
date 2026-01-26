'use client';

import { ChevronDown, ChevronRight, FileText, Plus } from 'lucide-react';
import { useState } from 'react';
import { useEditorStore } from '../stores/editorStore';
import type { Chapter } from '../db';

export function TreePanel() {
  const { chapters, scenes, selectedSceneId, setSelectedSceneId } = useEditorStore();
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(
    new Set(chapters.map(c => c.id!))
  );

  const toggleChapter = (chapterId: number) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const handleSceneClick = (sceneId: number) => {
    setSelectedSceneId(sceneId);
    // Scroll to scene in editor
    const sceneElement = document.getElementById(`scene-${sceneId}`);
    if (sceneElement) {
      sceneElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="flex h-full flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          구조
        </h2>
        <button
          className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          title="챕터 추가"
        >
          <Plus className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {chapters.map((chapter) => {
          const chapterScenes = scenes.filter(s => s.chapterId === chapter.id);
          const isExpanded = expandedChapters.has(chapter.id!);

          return (
            <div key={chapter.id} className="mb-1">
              {/* Chapter */}
              <button
                onClick={() => toggleChapter(chapter.id!)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-zinc-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-zinc-500" />
                )}
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {chapter.title}
                </span>
                <span className="ml-auto text-xs text-zinc-500">
                  {chapterScenes.length}
                </span>
              </button>

              {/* Scenes */}
              {isExpanded && (
                <div className="ml-6 mt-0.5">
                  {chapterScenes.map((scene) => (
                    <button
                      key={scene.id}
                      onClick={() => handleSceneClick(scene.id!)}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors ${
                        selectedSceneId === scene.id
                          ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                          : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span className="truncate">{scene.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
