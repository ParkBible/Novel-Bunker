"use client";

import { Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    chapterOps,
    characterOps,
    sceneOps,
    settingsOps,
} from "@/app/(shared)/db/operations";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { initializeDemoData } from "@/app/(shared)/utils/demoData";
import { AddSceneButton } from "./scene/AddSceneButton";
import { SceneCard } from "./scene/SceneCard";

interface ChapterContentProps {
    chapterId: number;
}

export function ChapterContent({ chapterId }: ChapterContentProps) {
    const {
        chapters,
        scenes,
        isInitialized,
        setChapters,
        setScenes,
        setCharacters,
        setSynopsis,
        setNovelTitle,
        setInitialized,
        updateChapterTitle,
    } = useEditorStore();

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState("");
    const titleInputRef = useRef<HTMLInputElement>(null);

    const loadData = useCallback(async () => {
        await initializeDemoData();

        const [
            loadedChapters,
            loadedScenes,
            loadedCharacters,
            synopsis,
            novelTitle,
        ] = await Promise.all([
            chapterOps.getAll(),
            sceneOps.getAll(),
            characterOps.getAll(),
            settingsOps.get("synopsis"),
            settingsOps.get("novelTitle"),
        ]);

        setChapters(loadedChapters);
        setScenes(loadedScenes);
        setCharacters(loadedCharacters);
        setSynopsis(synopsis || "");
        setNovelTitle(novelTitle || "");
        setInitialized(true);
    }, [
        setChapters,
        setScenes,
        setCharacters,
        setSynopsis,
        setNovelTitle,
        setInitialized,
    ]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const currentChapter = chapters.find((c) => c.id === chapterId);
    const chapterScenes = scenes.filter((s) => s.chapterId === chapterId);

    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    const startEditingTitle = () => {
        if (currentChapter) {
            setEditedTitle(currentChapter.title);
            setIsEditingTitle(true);
        }
    };

    const handleTitleSave = () => {
        const trimmed = editedTitle.trim();
        if (trimmed && currentChapter && trimmed !== currentChapter.title) {
            updateChapterTitle(chapterId, trimmed);
        }
        setIsEditingTitle(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleTitleSave();
        } else if (e.key === "Escape") {
            setIsEditingTitle(false);
        }
    };

    const handleAddScene = async (chapterId: number, order: number) => {
        await sceneOps.create(chapterId, "새 씬", order);
        await loadData();
    };

    const handleSceneUpdate = async () => {
        await loadData();
    };

    if (!isInitialized) {
        return (
            <div className="mx-auto max-w-4xl p-8">
                <div className="mb-6 h-8 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="space-y-4">
                    <div className="h-32 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-32 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-32 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                </div>
            </div>
        );
    }

    if (!currentChapter) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-zinc-500">챕터를 찾을 수 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl p-8">
            <div className="mb-12">
                <div className="group mb-6 flex items-center gap-2">
                    {isEditingTitle ? (
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={handleTitleKeyDown}
                            className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-2xl font-bold text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                        />
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={startEditingTitle}
                                className="text-left text-2xl font-bold text-zinc-900 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300"
                            >
                                {currentChapter.title}
                            </button>
                            <button
                                type="button"
                                onClick={startEditingTitle}
                                className="rounded p-1 opacity-0 transition-opacity hover:bg-zinc-100 group-hover:opacity-100 dark:hover:bg-zinc-800"
                                title="챕터 이름 편집"
                            >
                                <Pencil className="h-4 w-4 text-zinc-500" />
                            </button>
                        </>
                    )}
                </div>

                {chapterScenes.map((scene, index) => (
                    <div key={scene.id}>
                        <AddSceneButton
                            chapterId={chapterId}
                            order={scene.order}
                            onAdd={handleAddScene}
                        />
                        <SceneCard
                            scene={scene}
                            sceneIndex={index + 1}
                            onUpdate={handleSceneUpdate}
                        />
                    </div>
                ))}

                <AddSceneButton
                    chapterId={chapterId}
                    order={
                        chapterScenes.length > 0
                            ? chapterScenes[chapterScenes.length - 1].order + 1
                            : 0
                    }
                    onAdd={handleAddScene}
                />
            </div>
        </div>
    );
}
