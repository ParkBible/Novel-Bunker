"use client";

import {
    ChevronDown,
    ChevronRight,
    FileText,
    Plus,
    Trash2,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useEditorStore } from "../stores/editorStore";

interface TreePanelProps {
    onAddChapter: () => void;
}

export function TreePanel({ onAddChapter }: TreePanelProps) {
    const router = useRouter();
    const pathname = usePathname();
    const {
        chapters,
        scenes,
        selectedSceneId,
        setSelectedSceneId,
        deleteChapter,
        deleteScene,
    } = useEditorStore();
    const [expandedChapters, setExpandedChapters] = useState<Set<number>>(
        new Set(chapters.map((c) => c.id).filter((id): id is number => !!id)),
    );

    // 현재 URL에서 챕터 ID 추출
    const currentChapterId = pathname.startsWith("/chapter/")
        ? Number.parseInt(pathname.split("/")[2], 10)
        : null;

    const handleChapterClick = (chapterId: number) => {
        router.push(`/chapter/${chapterId}`);
    };

    const toggleChapter = (chapterId: number) => {
        const newExpanded = new Set(expandedChapters);
        if (newExpanded.has(chapterId)) {
            newExpanded.delete(chapterId);
        } else {
            newExpanded.add(chapterId);
        }
        setExpandedChapters(newExpanded);
    };

    const handleSceneClick = (sceneId: number, chapterId: number) => {
        setSelectedSceneId(sceneId);
        // 다른 챕터의 씬이면 페이지 이동
        if (currentChapterId !== chapterId) {
            router.push(`/chapter/${chapterId}`);
        }
        // 스크롤은 페이지 이동 후에 실행
        setTimeout(() => {
            const sceneElement = document.getElementById(`scene-${sceneId}`);
            if (sceneElement) {
                sceneElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }
        }, 100);
    };

    return (
        <div className="flex h-full flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    구조
                </h2>
                <button
                    type="button"
                    onClick={onAddChapter}
                    className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="챕터 추가"
                >
                    <Plus className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                </button>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto p-2">
                {chapters.map((chapter) => {
                    const chapterScenes = scenes.filter(
                        (s) => s.chapterId === chapter.id,
                    );
                    const isExpanded = chapter.id
                        ? expandedChapters.has(chapter.id)
                        : false;

                    return (
                        <div key={chapter.id} className="mb-1">
                            {/* Chapter */}
                            <div className="group flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                <button
                                    type="button"
                                    onClick={() =>
                                        chapter.id && toggleChapter(chapter.id)
                                    }
                                    className="p-0.5"
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-zinc-500" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        chapter.id &&
                                        handleChapterClick(chapter.id)
                                    }
                                    className={`flex flex-1 items-center gap-2 text-left ${
                                        currentChapterId === chapter.id
                                            ? "text-blue-600 dark:text-blue-400"
                                            : ""
                                    }`}
                                >
                                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                                        {chapter.title}
                                    </span>
                                    {chapterScenes.length > 0 && (
                                        <span className="text-xs text-zinc-500">
                                            {chapterScenes.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        chapter.id && deleteChapter(chapter.id)
                                    }
                                    className="ml-auto rounded p-0.5 opacity-0 transition-opacity hover:bg-zinc-200 group-hover:opacity-100 dark:hover:bg-zinc-700"
                                    title="챕터 삭제"
                                >
                                    <Trash2 className="h-3.5 w-3.5 text-zinc-500 hover:text-red-500" />
                                </button>
                            </div>

                            {/* Scenes */}
                            {isExpanded && (
                                <div className="ml-6 mt-0.5">
                                    {chapterScenes.map((scene) => (
                                        <div
                                            key={scene.id}
                                            className={`group flex w-full items-center gap-2 rounded px-2 py-1 text-sm transition-colors ${
                                                selectedSceneId === scene.id
                                                    ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                                                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    scene.id &&
                                                    chapter.id &&
                                                    handleSceneClick(
                                                        scene.id,
                                                        chapter.id,
                                                    )
                                                }
                                                className="flex flex-1 items-center gap-2 text-left"
                                            >
                                                <FileText className="h-3.5 w-3.5" />
                                                <span className="truncate">
                                                    {scene.title}
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    scene.id &&
                                                    deleteScene(scene.id)
                                                }
                                                className="rounded p-0.5 opacity-0 transition-opacity hover:bg-zinc-300 group-hover:opacity-100 dark:hover:bg-zinc-700"
                                                title="씬 삭제"
                                            >
                                                <Trash2 className="h-3 w-3 text-zinc-500 hover:text-red-500" />
                                            </button>
                                        </div>
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
