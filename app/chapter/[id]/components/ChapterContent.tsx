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

    const contentRootRef = useRef<HTMLDivElement>(null);
    const needsScrollAfterLoadRef = useRef(false);
    // 진행 중인 정렬 작업(옵저버/리스너)을 취소하는 함수
    const scrollCleanupRef = useRef<(() => void) | null>(null);

    // ChapterContent를 감싼 실제 스크롤 컨테이너(.editor-scroll)를 찾는다.
    // (데스크톱/모바일 모두 동일 클래스를 사용 — scrollIntoView의 조상 탐색 대신
    //  이 컨테이너의 scrollTop을 직접 제어해 중첩 스크롤 오작동을 피한다)
    const getScrollContainer = useCallback(
        () =>
            contentRootRef.current?.closest<HTMLElement>(".editor-scroll") ??
            null,
        [],
    );

    // 챕터 변경 또는 마운트 시: 진입 직후 선택된 씬으로 정렬해야 함을 표시
    // biome-ignore lint/correctness/useExhaustiveDependencies: chapterId 변경 시에만 실행 의도적
    useLayoutEffect(() => {
        needsScrollAfterLoadRef.current = !!selectedSceneId;
    }, [chapterId]);

    // 선택된 씬을 스크롤 컨테이너 최상단으로 정렬.
    // TipTap 에디터/폰트가 뒤늦게 펼쳐지며 높이가 바뀌므로, 고정 프레임 반복 대신
    // ResizeObserver로 "레이아웃이 안정될 때까지" 재정렬한다. 사용자가 직접
    // 스크롤하면 즉시 중단. (특히 모바일 탭 전환 재마운트 시 필수)
    const alignSelectedSceneToTop = useCallback(() => {
        const id = selectedSceneId;
        if (!id) return;
        scrollCleanupRef.current?.(); // 이전 정렬 작업 취소

        const container = getScrollContainer();
        const content = contentRootRef.current;
        if (!container || !content) return;

        const align = () => {
            // 데스크톱/모바일 레이아웃이 동시에 렌더되어 scene-{id}가 DOM에
            // 중복 존재한다. document.getElementById는 먼저 나오는 숨겨진
            // 데스크톱 사본을 반환하므로, 반드시 이 인스턴스의 서브트리에서 찾는다.
            const target = content.querySelector(`#scene-${id}`);
            if (!target) return;
            const delta =
                target.getBoundingClientRect().top -
                container.getBoundingClientRect().top;
            if (Math.abs(delta) > 1) container.scrollTop += delta;
        };

        align(); // 즉시 1회

        // 콘텐츠 높이가 바뀔 때마다(에디터 펼침 등) 재정렬
        // container가 존재하면 content(contentRootRef.current)도 항상 non-null
        const observer = new ResizeObserver(align);
        observer.observe(content);

        let cleaned = false;
        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            observer.disconnect();
            container.removeEventListener("wheel", cleanup);
            container.removeEventListener("touchmove", cleanup);
            clearTimeout(timer);
            scrollCleanupRef.current = null;
        };
        // 사용자가 직접 스크롤하면 자동 정렬 중단
        container.addEventListener("wheel", cleanup, { passive: true });
        container.addEventListener("touchmove", cleanup, { passive: true });
        // 안전 상한: 레이아웃이 그 안에 안정된다고 보고 관찰 종료
        const timer = setTimeout(cleanup, 1500);
        scrollCleanupRef.current = cleanup;
    }, [selectedSceneId, getScrollContainer]);

    // isInitialized는 로딩 완료(스크롤 컨테이너 마운트) 시 재실행하기 위한 의도적 의존성
    // biome-ignore lint/correctness/useExhaustiveDependencies: isInitialized는 재실행 트리거용
    useEffect(() => {
        if (!selectedSceneId) return;
        const container = getScrollContainer();
        // 아직 콘텐츠(스크롤 컨테이너)가 마운트되지 않음 — 로딩 완료 시 재실행됨
        // (needsScrollAfterLoad 플래그를 소비하지 않고 그대로 둔다)
        if (!container) return;

        if (needsScrollAfterLoadRef.current) {
            // 마운트 / 챕터 진입 / 모바일 탭 전환 재마운트: 선택 씬을 맨 위로 정렬
            needsScrollAfterLoadRef.current = false;
            alignSelectedSceneToTop();
        } else {
            // 같은 화면 내 씬 변경: 컨테이너 밖일 때만 부드럽게 스크롤
            // (중복 DOM 회피 위해 이 인스턴스의 서브트리에서 조회)
            const el = contentRootRef.current?.querySelector(
                `#scene-${selectedSceneId}`,
            );
            if (el) {
                const cRect = container.getBoundingClientRect();
                const eRect = el.getBoundingClientRect();
                const isVisible =
                    eRect.top < cRect.bottom && eRect.bottom > cRect.top;
                if (!isVisible) {
                    container.scrollTo({
                        top: container.scrollTop + (eRect.top - cRect.top),
                        behavior: "smooth",
                    });
                }
            }
        }

        // 씬 변경/언마운트 시 진행 중인 정렬 작업 정리
        return () => {
            scrollCleanupRef.current?.();
        };
    }, [
        selectedSceneId,
        isInitialized,
        alignSelectedSceneToTop,
        getScrollContainer,
    ]);

    // 모바일: 사용자가 손으로 편집 영역을 스크롤하면 포커스된 에디터를 블러한다.
    // 포커스된 contenteditable/input이 있으면 모바일 브라우저(특히 iOS)가 커서를
    // 화면에 유지하려고 스크롤을 커서 위치로 되돌리는 네이티브 동작이 있어
    // "스크롤 중 커서 씬으로 순간이동"이 발생한다. 실제 스크롤이 일어난 터치
    // 제스처에서만 블러하므로, 프로그램적 정렬 스크롤이나 제자리 텍스트 선택은
    // 영향을 받지 않는다.
    // isInitialized: 스크롤 컨테이너 마운트 후 리스너를 붙이기 위한 의존성
    // biome-ignore lint/correctness/useExhaustiveDependencies: isInitialized는 재실행 트리거용
    useEffect(() => {
        const container = getScrollContainer();
        if (!container) return;

        let touching = false;
        const onTouchStart = () => {
            touching = true;
        };
        const onTouchEnd = () => {
            touching = false;
        };
        const onScroll = () => {
            if (!touching) return; // 프로그램적(정렬) 스크롤 제외
            const active = document.activeElement;
            if (
                active instanceof HTMLElement &&
                container.contains(active) &&
                (active.isContentEditable ||
                    active.tagName === "INPUT" ||
                    active.tagName === "TEXTAREA")
            ) {
                active.blur();
            }
        };

        container.addEventListener("touchstart", onTouchStart, {
            passive: true,
        });
        container.addEventListener("touchend", onTouchEnd, { passive: true });
        container.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            container.removeEventListener("touchstart", onTouchStart);
            container.removeEventListener("touchend", onTouchEnd);
            container.removeEventListener("scroll", onScroll);
        };
    }, [getScrollContainer, isInitialized]);

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
        <div ref={contentRootRef} className="px-4 py-6 lg:px-8 lg:py-8">
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
