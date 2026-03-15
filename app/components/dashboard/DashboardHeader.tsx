"use client";

import { PenTool } from "lucide-react";
import Link from "next/link";
import { routes } from "@/app/(shared)/routes";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";

export function DashboardHeader() {
    const { novelTitle, chapters } = useEditorStore();

    const firstChapterId = chapters[0]?.id;

    return (
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {novelTitle || "제목 없음"}
            </h1>
            {firstChapterId && (
                <Link
                    href={routes.chapter(firstChapterId)}
                    className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                    <PenTool className="h-4 w-4" />
                    편집기 열기
                </Link>
            )}
        </div>
    );
}
