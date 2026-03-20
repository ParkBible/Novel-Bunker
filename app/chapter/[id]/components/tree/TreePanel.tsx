"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { chapterOps } from "@/app/(shared)/db/operations";
import { routes } from "@/app/(shared)/routes";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { CharacterSummaryContent } from "@/app/components/dashboard/CharacterSummary";
import { ChapterItem } from "./ChapterItem";
import { LoreSection } from "./LoreSection";
import { NovelTitleHeader } from "./NovelTitleHeader";
import { TreeSection } from "./TreeSection";

export function TreePanel() {
    const router = useRouter();
    const params = useParams();
    const {
        chapters,
        scenes,
        selectedSceneId,
        setSelectedSceneId,
        setDetailPanel,
        expandedChapterIds,
        toggleExpandedChapter,
        deleteChapter,
        deleteScene,
        novelTitle,
        updateNovelTitle,
        updateChapterTitle,
        reorderScenes,
    } = useEditorStore();

    const currentChapterId = params.id
        ? Number.parseInt(params.id as string, 10)
        : null;

    const handleAddChapter = async () => {
        const newChapterId = await chapterOps.create(
            `챕터 ${chapters.length + 1}`,
        );

        if (newChapterId) {
            router.push(routes.chapter(newChapterId));
        }
    };

    const { detailPanel } = useEditorStore();
    const scrollToSceneRef = useRef(false);

    const handleChapterClick = (chapterId: number) => {
        setSelectedSceneId(null);
        if (detailPanel) {
            setDetailPanel({ type: "chapter", chapterId });
        }
        router.push(routes.chapter(chapterId));
    };

    const handleSceneClick = (sceneId: number, chapterId: number) => {
        scrollToSceneRef.current = true;
        setSelectedSceneId(sceneId);
        if (detailPanel) {
            setDetailPanel({ type: "scene", sceneId });
        }

        if (currentChapterId !== chapterId) {
            router.push(routes.chapter(chapterId));
        }
    };

    const handleDetailOpen = () => {
        if (selectedSceneId) {
            setDetailPanel({ type: "scene", sceneId: selectedSceneId });
        } else if (currentChapterId) {
            setDetailPanel({ type: "chapter", chapterId: currentChapterId });
        }
    };

    useEffect(() => {
        if (selectedSceneId === null || !scrollToSceneRef.current) return;
        scrollToSceneRef.current = false;

        const el = document.getElementById(`scene-${selectedSceneId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [selectedSceneId]);

    return (
        <div className="flex h-full flex-col gap-3 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <NovelTitleHeader
                title={novelTitle}
                onTitleUpdate={updateNovelTitle}
                onAddChapter={handleAddChapter}
            />

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
                <TreeSection
                    title="챕터"
                    className="flex flex-col gap-2 px-2 pb-2"
                    headerAction={
                        <button
                            type="button"
                            onClick={handleDetailOpen}
                            className="rounded p-0.5 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                            title={
                                selectedSceneId
                                    ? "씬 상세 보기"
                                    : "챕터 상세 보기"
                            }
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="size-4"
                                role="img"
                                aria-label="상세 보기"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    }
                >
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
                                isCurrentChapter={
                                    currentChapterId === chapter.id
                                }
                                selectedSceneId={selectedSceneId}
                                onToggle={() =>
                                    chapter.id &&
                                    toggleExpandedChapter(chapter.id)
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
                                onSceneReorder={(activeId, overId) =>
                                    chapter.id &&
                                    reorderScenes(chapter.id, activeId, overId)
                                }
                            />
                        );
                    })}
                </TreeSection>

                <TreeSection
                    title="등장인물"
                    className="px-2 pb-2 flex flex-col gap-2"
                >
                    <div className="px-2 pt-1">
                        <CharacterSummaryContent />
                    </div>
                </TreeSection>

                <TreeSection
                    title="설정집"
                    className="flex flex-col gap-2 px-2 pb-2"
                >
                    <div className="px-2 pt-1">
                        <LoreSection />
                    </div>
                </TreeSection>
            </div>
        </div>
    );
}
