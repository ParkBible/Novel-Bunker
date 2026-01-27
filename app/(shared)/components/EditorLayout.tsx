"use client";

import { useEffect, useCallback } from "react";
import { TreePanel } from "./TreePanel";
import { SceneCard } from "./SceneCard";
import { AddSceneButton } from "./AddSceneButton";
import { ContextPanel } from "./ContextPanel";
import { useEditorStore } from "../stores/editorStore";
import {
    chapterOps,
    sceneOps,
    characterOps,
    settingsOps,
} from "../db/operations";
import { initializeDemoData } from "../utils/demoData";

export function EditorLayout() {
    const {
        chapters,
        scenes,
        setChapters,
        setScenes,
        setCharacters,
        setSynopsis,
    } = useEditorStore();

    const loadData = useCallback(async () => {
        // Initialize demo data if needed
        await initializeDemoData();

        // Load all data
        const [loadedChapters, loadedScenes, loadedCharacters, synopsis] =
            await Promise.all([
                chapterOps.getAll(),
                sceneOps.getAll(),
                characterOps.getAll(),
                settingsOps.get("synopsis"),
            ]);

        setChapters(loadedChapters);
        setScenes(loadedScenes);
        setCharacters(loadedCharacters);
        setSynopsis(synopsis || "");
    }, [setChapters, setScenes, setCharacters, setSynopsis]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAddScene = async (chapterId: number, order: number) => {
        await sceneOps.create(chapterId, `새 씬 ${order + 1}`, order);
        await loadData();
    };

    const handleSceneUpdate = async () => {
        await loadData();
    };

    return (
        <div className="flex h-screen bg-zinc-50 dark:bg-black">
            {/* Left Panel - Tree */}
            <div className="w-64 flex-shrink-0">
                <TreePanel />
            </div>

            {/* Center Panel - Editor */}
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-4xl p-8">
                    {chapters.map((chapter) => {
                        const chapterScenes = scenes.filter(
                            (s) => s.chapterId === chapter.id,
                        );

                        return (
                            <div key={chapter.id} className="mb-12">
                                {/* Chapter Header */}
                                <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                                    {chapter.title}
                                </h2>

                                {/* Scenes */}
                                {chapterScenes.map((scene, index) => (
                                    <div key={scene.id}>
                                        <SceneCard
                                            scene={scene}
                                            onUpdate={handleSceneUpdate}
                                        />
                                        <AddSceneButton
                                            chapterId={chapter.id!}
                                            order={scene.order + 1}
                                            onAdd={handleAddScene}
                                        />
                                    </div>
                                ))}

                                {/* Add first scene if none exist */}
                                {chapterScenes.length === 0 && (
                                    <AddSceneButton
                                        chapterId={chapter.id!}
                                        order={0}
                                        onAdd={handleAddScene}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right Panel - Context */}
            <div className="w-80 flex-shrink-0">
                <ContextPanel />
            </div>
        </div>
    );
}
