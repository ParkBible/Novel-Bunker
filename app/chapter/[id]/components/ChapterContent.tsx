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
import { useLocalSnapshots } from "@/app/(shared)/hooks/useLocalSnapshots";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { AddSceneButton } from "./scene/AddSceneButton";
import { SceneCard } from "./scene/SceneCard";

interface ChapterContentProps {
    chapterId: number;
}

// 요소가 속한 실제 스크롤 컨테이너(overflow-y auto/scroll)를 찾는다.
// 모바일/데스크톱 모두 window가 아니라 내부 div가 스크롤되므로 필수.
function getScrollParent(node: HTMLElement | null): HTMLElement | null {
    let el = node?.parentElement ?? null;
    while (el) {
        const oy = getComputedStyle(el).overflowY;
        if (oy === "auto" || oy === "scroll") return el;
        el = el.parentElement;
    }
    return null;
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

    // 로컬 버전 히스토리 자동 스냅샷
    useLocalSnapshots();

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
    const settleCleanupRef = useRef<(() => void) | null>(null);

    // 챕터 변경 또는 마운트 시: 진입 직후 선택된 씬으로 정렬해야 함을 표시
    // biome-ignore lint/correctness/useExhaustiveDependencies: chapterId 변경 시에만 실행 의도적
    useLayoutEffect(() => {
        needsScrollAfterLoadRef.current = !!selectedSceneId;
    }, [chapterId]);

    // 선택된 씬을 스크롤 컨테이너 최상단에 맞춘다.
    // scrollIntoView는 모바일(iOS Safari) 내부 컨테이너에서 자주 무시되므로,
    // 컨테이너 기준 상대 위치를 계산해 scrollTop을 직접 설정한다(신뢰성 ↑).
    const alignSelectedToTop = useCallback(() => {
        const id = selectedSceneId;
        if (!id) return;
        const el = document.getElementById(`scene-${id}`);
        if (!el) return;
        const container = getScrollParent(el);
        if (!container) {
            el.scrollIntoView({ block: "start" });
            return;
        }
        const delta =
            el.getBoundingClientRect().top -
            container.getBoundingClientRect().top;
        if (Math.abs(delta) > 1) container.scrollTop += delta;
    }, [selectedSceneId]);

    // 진입/탭 전환 직후 선택 씬으로 정렬.
    // TipTap 에디터가 한 박자 늦게 펼쳐지며 위치가 밀리므로, 고정 프레임 수로
    // 추측하지 않고 ResizeObserver로 레이아웃이 확정될 때까지 재정렬한다(결정적).
    // 단, 사용자가 손으로 스크롤하면 즉시 중단해 "스크롤 중 순간이동"을 막는다.
    const runSettlingScroll = useCallback(() => {
        settleCleanupRef.current?.();
        if (!selectedSceneId) return;

        const el = document.getElementById(`scene-${selectedSceneId}`);
        const container = getScrollParent(el);
        // 관찰 대상은 컨테이너가 아니라 "콘텐츠 래퍼". 컨테이너를 관찰하면
        // 모바일 주소창 표시/숨김에 의한 높이 변화로 오작동한다.
        const content = container?.firstElementChild ?? null;

        alignSelectedToTop();

        let raf = 0;
        const realign = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(alignSelectedToTop);
        };

        const ro =
            content && typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(realign)
                : null;
        if (ro && content) ro.observe(content);

        // 사용자가 직접 스크롤/터치하면 정렬을 포기하고 사용자 조작을 존중
        const stop = () => cleanup();
        container?.addEventListener("wheel", stop, { passive: true });
        container?.addEventListener("touchmove", stop, { passive: true });

        const timer = window.setTimeout(() => cleanup(), 1200);

        function cleanup() {
            ro?.disconnect();
            cancelAnimationFrame(raf);
            clearTimeout(timer);
            container?.removeEventListener("wheel", stop);
            container?.removeEventListener("touchmove", stop);
            settleCleanupRef.current = null;
        }
        settleCleanupRef.current = cleanup;
    }, [selectedSceneId, alignSelectedToTop]);

    useEffect(() => {
        if (!selectedSceneId) return;

        if (needsScrollAfterLoadRef.current) {
            // 마운트 / 챕터 진입 / 모바일 탭 전환 재마운트: 선택 씬을 맨 위로 정렬
            needsScrollAfterLoadRef.current = false;
            runSettlingScroll();
        } else {
            // 같은 화면 내 씬 변경: 컨테이너 기준 화면 밖일 때만 정렬
            const el = document.getElementById(`scene-${selectedSceneId}`);
            const container = getScrollParent(el);
            if (el && container) {
                const elRect = el.getBoundingClientRect();
                const cRect = container.getBoundingClientRect();
                const isVisible =
                    elRect.top < cRect.bottom && elRect.bottom > cRect.top;
                if (!isVisible) alignSelectedToTop();
            }
        }

        // 씬 변경/언마운트 시 진행 중인 정렬 루프 정리
        return () => {
            settleCleanupRef.current?.();
        };
    }, [selectedSceneId, runSettlingScroll, alignSelectedToTop]);

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
