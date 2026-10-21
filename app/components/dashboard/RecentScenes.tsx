"use client";

import { History } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { routes } from "@/app/(shared)/routes";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { DashboardCard } from "./DashboardCard";
import { recentScenes, stripTags } from "./dashboardUtils";

const LIMIT = 5;
const EXCERPT_LENGTH = 80;

type T = ReturnType<typeof useTranslation>;

function timeAgo(date: Date, t: T): string {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
    if (minutes < 1) return t("time_justNow");
    if (minutes < 60) return t("time_minutesAgo", { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("time_hoursAgo", { n: hours });
    return t("time_daysAgo", { n: Math.floor(hours / 24) });
}

// 이어 쓸 자리를 떠올리기 쉽도록 앞이 아니라 끝부분을 보여준다
function tailExcerpt(html: string): string {
    const text = stripTags(html).replace(/\s+/g, " ").trim();
    return text.length > EXCERPT_LENGTH
        ? `…${text.slice(-EXCERPT_LENGTH)}`
        : text;
}

export function RecentScenes() {
    const t = useTranslation();
    const { scenes, chapters, setSelectedSceneId } = useEditorStore();
    const chapterTitles = new Map(chapters.map((c) => [c.id, c.title]));
    const recent = recentScenes(scenes, LIMIT);

    return (
        <DashboardCard title={t("recent_title")} icon={History}>
            {recent.length === 0 ? (
                <p className="text-sm text-zinc-500">{t("recent_empty")}</p>
            ) : (
                <ul className="-mx-2 space-y-1">
                    {recent.map((scene) => {
                        const excerpt = tailExcerpt(scene.content);
                        return (
                            <li key={scene.id}>
                                <Link
                                    href={routes.chapter(scene.chapterId)}
                                    onClick={() =>
                                        setSelectedSceneId(scene.id ?? null)
                                    }
                                    className="block rounded-md p-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                >
                                    <div className="flex items-baseline justify-between gap-3 text-sm">
                                        <span className="min-w-0 truncate font-medium text-zinc-900 dark:text-zinc-50">
                                            {scene.title ||
                                                t("version_untitledScene")}
                                        </span>
                                        <span className="shrink-0 text-xs text-zinc-500">
                                            {timeAgo(
                                                new Date(scene.updatedAt),
                                                t,
                                            )}
                                        </span>
                                    </div>
                                    <p className="truncate text-xs text-zinc-500">
                                        {chapterTitles.get(scene.chapterId)}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                                        {excerpt || t("recent_emptyScene")}
                                    </p>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </DashboardCard>
    );
}
