"use client";

import { BookOpen, MessageSquare, Pencil } from "lucide-react";
import { useState } from "react";
import { ChapterContent } from "./ChapterContent";
import { ContextPanel } from "./context/ContextPanel";
import { TreePanel } from "./tree/TreePanel";

type MobileTab = "tree" | "editor" | "context";

interface ChapterLayoutProps {
    chapterId: number;
}

const TABS: { id: MobileTab; label: string; Icon: React.ElementType }[] = [
    { id: "tree", label: "목차", Icon: BookOpen },
    { id: "editor", label: "편집", Icon: Pencil },
    { id: "context", label: "AI", Icon: MessageSquare },
];

export function ChapterLayout({ chapterId }: ChapterLayoutProps) {
    const [activeTab, setActiveTab] = useState<MobileTab>("editor");

    return (
        <>
            {/* 데스크탑: 기존 3패널 */}
            <div className="hidden h-screen bg-zinc-50 md:flex dark:bg-black">
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

            {/* 모바일: 탭 전환 */}
            <div className="flex h-screen flex-col bg-zinc-50 md:hidden dark:bg-black">
                <div className="min-h-0 flex-1 overflow-hidden">
                    {activeTab === "tree" && (
                        <div className="h-full overflow-y-auto">
                            <TreePanel />
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

                {/* 하단 탭바 */}
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
