"use client";

import { Pencil } from "lucide-react";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { sceneOps } from "@/app/(shared)/db/operations";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
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
        loadData,
        updateChapterTitle,
        selectedSceneId,
    } = useEditorStore();
    const t = useTranslation();

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState("");
    const titleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isInitialized) {
            loadData();
        }
    }, [isInitialized, loadData]);

    const currentChapter = chapters.find((c) => c.id === chapterId);
    const chapterScenes = scenes.filter((s) => s.chapterId === chapterId);

    const needsScrollAfterLoadRef = useRef(false);
    const editorReadyCountRef = useRef(0);

    // 챕터 변경 또는 마운트 시: 에디터 로드 전 스크롤 플래그를 먼저 세팅
    // useLayoutEffect를 사용해 TipTap의 useEffect(onCreate)보다 먼저 실행되도록 보장
    // biome-ignore lint/correctness/useExhaustiveDependencies: chapterId 변경 시에만 실행 의도적
    useLayoutEffect(() => {
        if (selectedSceneId) {
            needsScrollAfterLoadRef.current = true;
            editorReadyCountRef.current = 0;
        }
    }, [chapterId]);

    // 같은 챕터 내 씬 이동: 에디터 이미 초기화됨, 뷰포트 밖일 때만 스크롤
    useEffect(() => {
        if (needsScrollAfterLoadRef.current) return;
        if (!selectedSceneId) return;
        const el = document.getElementById(`scene-${selectedSceneId}`);
        if (!el) return;
        const { top, bottom } = el.getBoundingClientRect();
        const isVisible = top < window.innerHeight && bottom > 0;
        if (!isVisible) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [selectedSceneId]);

    // 다른 챕터 이동 / 모바일 탭 전환으로 인한 재마운트: 모든 에디터 초기화 완료 후 스크롤
    const handleEditorReady = useCallback(() => {
        if (!needsScrollAfterLoadRef.current) return;
        editorReadyCountRef.current += 1;
        if (editorReadyCountRef.current < chapterScenes.length) return;
        needsScrollAfterLoadRef.current = false;
        if (!selectedSceneId) return;
        // 갓 마운트된 스크롤 컨테이너에 즉시 smooth 스크롤을 호출하면
        // 레이아웃/페인트가 안정되기 전이라 모바일 브라우저가 무시함.
        // 두 번의 rAF로 레이아웃이 확정된 뒤 스크롤하도록 보장.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const el = document.getElementById(`scene-${selectedSceneId}`);
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
    }, [chapterScenes.length, selectedSceneId]);

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
        await sceneOps.create(chapterId, t("chapterContent_newScene"), order);
        await loadData();
    };

    const handleSceneUpdate = async () => {
        await loadData();
    };

    if (!isInitialized) {
        return (
            <div className="px-4 py-6 lg:px-8 lg:py-8">
                <div className="mx-auto max-w-3xl">
                    <div className="mb-6 h-8 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="space-y-4">
                        <div className="h-32 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-32 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-32 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                </div>
            </div>
        );
    }

    if (!currentChapter) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-zinc-500">{t("chapterContent_notFound")}</p>
            </div>
        );
    }

    return (
        <div className="px-4 py-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-3xl">
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
                                onEditorReady={handleEditorReady}
                            />
                        </div>
                    ))}

                    <AddSceneButton
                        chapterId={chapterId}
                        order={
                            chapterScenes.length > 0
                                ? chapterScenes[chapterScenes.length - 1]
                                      .order + 1
                                : 0
                        }
                        onAdd={handleAddScene}
                    />
                </div>
            </div>
        </div>
    );
}
