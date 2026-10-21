"use client";

import { PenTool } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { routes } from "@/app/(shared)/routes";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { recentScenes } from "./dashboardUtils";

export function DashboardHeader() {
    const t = useTranslation();
    const { novelTitle, chapters, scenes, setSelectedSceneId } =
        useEditorStore();

    // 마지막으로 작업한 씬이 있으면 그 자리로, 없으면 첫 챕터로
    const lastScene = recentScenes(scenes, 1)[0];
    const targetChapterId = lastScene?.chapterId ?? chapters[0]?.id;

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="min-w-0 break-words text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {novelTitle || t("dashboard_noTitle")}
            </h1>
            {targetChapterId && (
                <Link
                    href={routes.chapter(targetChapterId)}
                    onClick={() => setSelectedSceneId(lastScene?.id ?? null)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                    <PenTool className="h-4 w-4" />
                    {lastScene
                        ? t("dashboard_continue")
                        : t("dashboard_openEditor")}
                </Link>
            )}
        </div>
    );
}
