"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { chapterOps } from "@/app/(shared)/db/operations";
import { routes } from "@/app/(shared)/routes";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { ChapterItem } from "./ChapterItem";
import { NovelTitleHeader } from "./NovelTitleHeader";

export function TreePanel() {
    const router = useRouter();
    const pathname = usePathname();
    const {
        chapters,
        scenes,
        selectedSceneId,
        setSelectedSceneId,
        expandedChapterIds,
        toggleExpandedChapter,
        deleteChapter,
        deleteScene,
        novelTitle,
        updateNovelTitle,
        updateChapterTitle,
    } = useEditorStore();

    const currentChapterId = pathname.startsWith(routes.chapterPrefix)
        ? Number.parseInt(pathname.split("/")[2], 10)
        : null;

    const handleAddChapter = async () => {
        const newChapterId = await chapterOps.create(
            `챕터 ${chapters.length + 1}`,
        );

        if (newChapterId) {
            router.push(routes.chapter(newChapterId));
        }
    };

    const handleChapterClick = (chapterId: number) => {
        setSelectedSceneId(null);
        router.push(routes.chapter(chapterId));
    };

    const handleSceneClick = (sceneId: number, chapterId: number) => {
        setSelectedSceneId(sceneId);

        if (currentChapterId !== chapterId) {
            router.push(routes.chapter(chapterId));
        }
    };

    useEffect(() => {
        if (selectedSceneId === null) return;

        const el = document.getElementById(`scene-${selectedSceneId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [selectedSceneId]);

    return (
        <div className="flex h-full flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <NovelTitleHeader
                title={novelTitle}
                onTitleUpdate={updateNovelTitle}
                onAddChapter={handleAddChapter}
            />

            <div className="flex-1 overflow-y-auto p-2">
                {chapters.map((chapter) => {
                    const chapterScenes = scenes.filter(
                        (s) => s.chapterId === chapter.id,
                    );

                    const isExpanded = chapter.id
                        ? expandedChapterIds.has(chapter.id)
                        : false;

                    return (
                        <ChapterItem
                            key={chapter.id}
                            chapter={chapter}
                            scenes={chapterScenes}
                            isExpanded={isExpanded}
                            isCurrentChapter={currentChapterId === chapter.id}
                            selectedSceneId={selectedSceneId}
                            onToggle={() =>
                                chapter.id && toggleExpandedChapter(chapter.id)
                            }
                            onClick={() =>
                                chapter.id && handleChapterClick(chapter.id)
                            }
                            onTitleUpdate={(title) =>
                                chapter.id &&
                                updateChapterTitle(chapter.id, title)
                            }
                            onDelete={() =>
                                chapter.id && deleteChapter(chapter.id)
                            }
                            onSceneSelect={(sceneId) =>
                                chapter.id &&
                                handleSceneClick(sceneId, chapter.id)
                            }
                            onSceneDelete={deleteScene}
                        />
                    );
                })}
            </div>
        </div>
    );
}
