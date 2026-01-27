"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import {
    chapterOps,
    characterOps,
    sceneOps,
    settingsOps,
} from "../db/operations";
import { useEditorStore } from "../stores/editorStore";
import { initializeDemoData } from "../utils/demoData";
import { AddSceneButton } from "./AddSceneButton";
import { ContextPanel } from "./ContextPanel";
import { SceneCard } from "./SceneCard";
import { TreePanel } from "./TreePanel";

interface ChapterViewProps {
    chapterId: number;
}

export function ChapterView({ chapterId }: ChapterViewProps) {
    const router = useRouter();
    const {
        chapters,
        scenes,
        setChapters,
        setScenes,
        setCharacters,
        setSynopsis,
    } = useEditorStore();

    const loadData = useCallback(async () => {
        await initializeDemoData();

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

    const currentChapter = chapters.find((c) => c.id === chapterId);
    const chapterScenes = scenes.filter((s) => s.chapterId === chapterId);

    const handleAddScene = async (chapterId: number, order: number) => {
        await sceneOps.create(chapterId, `새 씬 ${order + 1}`, order);
        await loadData();
    };

    const handleSceneUpdate = async () => {
        await loadData();
    };

    const handleAddChapter = async () => {
        const chapterCount = chapters.length;
        const newChapter = await chapterOps.create(`챕터 ${chapterCount + 1}`);
        await loadData();
        if (newChapter) {
            router.push(`/chapter/${newChapter}`);
        }
    };

    if (!currentChapter) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
                <p className="text-zinc-500">챕터를 찾을 수 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-zinc-50 dark:bg-black">
            {/* Left Panel - Tree */}
            <div className="w-64 flex-shrink-0">
                <TreePanel onAddChapter={handleAddChapter} />
            </div>

            {/* Center Panel - Editor */}
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-4xl p-8">
                    <div className="mb-12">
                        {/* Chapter Header */}
                        <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                            {currentChapter.title}
                        </h2>

                        {/* Scenes */}
                        {chapterScenes.map((scene) => (
                            <div key={scene.id}>
                                <SceneCard
                                    scene={scene}
                                    onUpdate={handleSceneUpdate}
                                />
                                <AddSceneButton
                                    chapterId={chapterId}
                                    order={scene.order + 1}
                                    onAdd={handleAddScene}
                                />
                            </div>
                        ))}

                        {/* Add first scene if none exist */}
                        {chapterScenes.length === 0 && (
                            <AddSceneButton
                                chapterId={chapterId}
                                order={0}
                                onAdd={handleAddScene}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Right Panel - Context */}
            <div className="w-80 flex-shrink-0">
                <ContextPanel />
            </div>
        </div>
    );
}
