"use client";

import { PenTool } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { routes } from "@/app/(shared)/routes";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";

export function DashboardHeader() {
    const t = useTranslation();
    const { novelTitle, chapters } = useEditorStore();

    const firstChapterId = chapters[0]?.id;

    return (
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {novelTitle || t("dashboard_noTitle")}
            </h1>
            {firstChapterId && (
                <Link
                    href={routes.chapter(firstChapterId)}
                    className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                    <PenTool className="h-4 w-4" />
                    {t("dashboard_openEditor")}
                </Link>
            )}
        </div>
    );
}
