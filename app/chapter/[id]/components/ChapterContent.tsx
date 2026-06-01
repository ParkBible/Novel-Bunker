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

    // 챕터 변경 또는 마운트 시: 진입 직후 선택된 씬으로 정렬해야 함을 표시
    // biome-ignore lint/correctness/useExhaustiveDependencies: chapterId 변경 시에만 실행 의도적
    useLayoutEffect(() => {
        needsScrollAfterLoadRef.current = !!selectedSceneId;
    }, [chapterId]);

    // 선택된 씬으로 스크롤.
    // TipTap 에디터 콘텐츠가 한 박자 늦게 펼쳐지면서 씬 위치가 밀리므로,
    // 여러 프레임에 걸쳐 재시도해 레이아웃이 확정된 최종 위치로 보정한다.
    // (특히 모바일에서 목차 탭 → 편집 탭 전환으로 재마운트될 때 필수)
    const scrollToSelectedScene = useCallback(() => {
        const id = selectedSceneId;
        if (!id) return;
        let frame = 0;
        const step = () => {
            const el = document.getElementById(`scene-${id}`);
            if (el) {
                el.scrollIntoView({ behavior: "auto", block: "start" });
            }
            frame += 1;
            if (frame < 10) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [selectedSceneId]);

    useEffect(() => {
        if (!selectedSceneId) return;

        // 마운트 / 챕터 진입 / 모바일 탭 전환 재마운트: 선택 씬을 맨 위로 정렬
        if (needsScrollAfterLoadRef.current) {
            needsScrollAfterLoadRef.current = false;
            scrollToSelectedScene();
            return;
        }

        // 같은 화면 내 씬 변경: 화면 밖일 때만 부드럽게 스크롤
        const el = document.getElementById(`scene-${selectedSceneId}`);
        if (!el) return;
        const { top, bottom } = el.getBoundingClientRect();
        const isVisible = top < window.innerHeight && bottom > 0;
        if (!isVisible) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [selectedSceneId, scrollToSelectedScene]);

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
