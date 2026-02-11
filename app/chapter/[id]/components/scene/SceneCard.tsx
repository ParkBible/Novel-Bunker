"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Scene } from "@/app/(shared)/db";
import { sceneOps } from "@/app/(shared)/db/operations";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { SceneEditor } from "./SceneEditor";

interface SceneCardProps {
    scene: Scene;
    sceneIndex?: number;
    onUpdate: () => void;
}

export function SceneCard({ scene, sceneIndex, onUpdate }: SceneCardProps) {
    const { selectedSceneId, setSelectedSceneId, deleteScene } =
        useEditorStore();
    const [title, setTitle] = useState(scene.title);
    const [content, setContent] = useState(scene.content);
    const isSelected = selectedSceneId === scene.id;

    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (title !== scene.title && scene.id !== undefined) {
                await sceneOps.update(scene.id, { title });
                onUpdate();
            }
        }, 500);
        return () => clearTimeout(timeout);
    }, [title, scene.title, scene.id, onUpdate]);

    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (content !== scene.content && scene.id !== undefined) {
                await sceneOps.updateContent(scene.id, content);
                onUpdate();
            }
        }, 1000);
        return () => clearTimeout(timeout);
    }, [content, scene.content, scene.id, onUpdate]);

    const handleClick = () => {
        if (scene.id !== undefined) {
            setSelectedSceneId(scene.id);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            handleClick();
        }
    };

    return (
        // biome-ignore lint/a11y/useSemanticElements: 내부에 input/button 포함으로 button 사용 불가
        <div
            id={`scene-${scene.id}`}
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={`w-full cursor-pointer rounded-lg border bg-white transition-all dark:bg-zinc-900 ${
                isSelected
                    ? "border-zinc-400 shadow-md dark:border-zinc-600"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
            }`}
        >
            <div className="group/title flex items-center border-b border-zinc-200 dark:border-zinc-800">
                {sceneIndex && (
                    <span className="pl-4 text-sm font-medium text-zinc-400 dark:text-zinc-500">
                        #{sceneIndex}
                    </span>
                )}
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="flex-1 bg-transparent px-3 py-3 text-lg font-semibold text-zinc-900 focus:outline-none dark:text-zinc-50"
                    placeholder="씬 제목"
                />
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (scene.id) deleteScene(scene.id);
                    }}
                    className="mr-3 rounded p-1 opacity-0 transition-opacity hover:bg-zinc-100 group-hover/title:opacity-100 dark:hover:bg-zinc-800"
                    title="씬 삭제"
                >
                    <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-500" />
                </button>
            </div>

            <div className="min-h-[200px]">
                <SceneEditor
                    content={content}
                    onChange={setContent}
                    placeholder="씬 내용을 작성하세요..."
                />
            </div>

            <div className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800">
                {scene.characters.length > 0 && (
                    <span>등장인물: {scene.characters.join(", ")}</span>
                )}
            </div>
        </div>
    );
}
