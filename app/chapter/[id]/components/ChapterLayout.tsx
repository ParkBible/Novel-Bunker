"use client";

import { BookOpen, MessageSquare, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { ChapterContent } from "./ChapterContent";
import { ContextPanel } from "./context/ContextPanel";
import { TreePanel } from "./tree/TreePanel";

type MobileTab = "tree" | "editor" | "context";

interface ChapterLayoutProps {
    chapterId: number;
}

export function ChapterLayout({ chapterId }: ChapterLayoutProps) {
    const t = useTranslation();
    const [activeTab, setActiveTab] = useState<MobileTab>("editor");
    const detailPanel = useEditorStore((s) => s.detailPanel);
    const prevDetailPanelRef = useRef(detailPanel);

    // 설정집/캐릭터 상세가 "새로 열릴 때"만 모바일에서 컨텍스트 탭으로 전환.
    // detailPanel은 닫기 전까지 스토어에 남아있으므로, 단순히 truthy 여부로
    // 전환하면 (다른 챕터 씬 클릭 등으로) 재마운트될 때 잔존 값 때문에
    // 의도치 않게 AI 탭으로 튀는 문제가 생긴다 → 실제 전환(open)만 감지.
    useEffect(() => {
        const prev = prevDetailPanelRef.current;
        prevDetailPanelRef.current = detailPanel;
        if (detailPanel && detailPanel !== prev) setActiveTab("context");
    }, [detailPanel]);

    const TABS: { id: MobileTab; label: string; Icon: React.ElementType }[] = [
        { id: "tree", label: t("chapterLayout_toc"), Icon: BookOpen },
        { id: "editor", label: t("chapterLayout_edit"), Icon: Pencil },
        { id: "context", label: t("layout_ai"), Icon: MessageSquare },
    ];

    return (
        <>
            {/* Desktop: 3-panel layout */}
            <div className="hidden h-screen bg-zinc-50 lg:flex dark:bg-black">
                <div className="w-[clamp(16rem,17vw,20rem)] flex-shrink-0">
                    <TreePanel />
                </div>
                <div className="editor-scroll flex-1 overflow-y-auto">
                    <ChapterContent chapterId={chapterId} />
                </div>
                <div className="w-[clamp(20rem,21vw,24rem)] flex-shrink-0">
                    <ContextPanel />
                </div>
            </div>

            {/* Mobile/tablet: tab switching */}
            <div className="flex h-screen flex-col bg-zinc-50 lg:hidden dark:bg-black">
                <div className="min-h-0 flex-1 overflow-hidden">
                    {activeTab === "tree" && (
                        <div className="h-full overflow-y-auto">
                            <TreePanel
                                onSceneSelect={() => setActiveTab("editor")}
                            />
                        </div>
                    )}
                    {activeTab === "editor" && (
                        <div className="editor-scroll h-full overflow-y-auto">
                            <ChapterContent chapterId={chapterId} />
                        </div>
                    )}
                    {activeTab === "context" && (
                        <div className="h-full overflow-hidden">
                            <ContextPanel />
                        </div>
                    )}
                </div>

                <nav className="flex border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                    {TABS.map(({ id, label, Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActiveTab(id)}
                            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
                                activeTab === id
                                    ? "text-blue-500"
                                    : "text-zinc-500 dark:text-zinc-400"
                            }`}
                        >
                            <Icon className="h-5 w-5" />
                            {label}
                        </button>
                    ))}
                </nav>
            </div>
        </>
    );
}
