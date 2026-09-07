"use client";

import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import type { SceneDiff } from "@/app/(shared)/utils/diff";
import { DiffLines } from "./DiffLines";

interface Props {
    diffs: SceneDiff[];
    versionLabel: string;
}

// 선택한 버전이 "이전", 현재 원고가 "이후"다. 줄 렌더링은 DiffLines가 맡는다.
export function VersionDiffViewer({ diffs, versionLabel }: Props) {
    const t = useTranslation();
    const changed = diffs.filter((d) => d.status !== "unchanged");

    if (changed.length === 0) {
        return (
            <p className="py-10 text-center text-xs text-zinc-400">
                {t("version_noChanges")}
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* 어느 시점의 원고를 보고 있는지 스크롤해도 보이게 고정 */}
            <div className="sticky top-0 z-10 flex items-baseline gap-2 bg-white pb-2 pt-1 dark:bg-zinc-900">
                <span className="px-2 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
                    {versionLabel}
                </span>
                <span className="text-[11px] text-zinc-400">
                    {t("version_changedScenes", { n: changed.length })}
                </span>
            </div>

            <p className="flex flex-wrap items-center gap-x-3 px-2 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                    <span className="inline-block size-2 rounded-sm bg-red-300 dark:bg-red-900" />
                    {t("version_legendRemoved")}
                </span>
                <span className="flex items-center gap-1">
                    <span className="inline-block size-2 rounded-sm bg-emerald-300 dark:bg-emerald-900" />
                    {t("version_legendAdded")}
                </span>
            </p>

            {changed.map((scene) => (
                <section key={scene.sceneId} className="flex flex-col gap-1.5">
                    <header className="flex items-center gap-1.5 border-b border-zinc-100 px-2 pb-1.5 dark:border-zinc-800">
                        {scene.status === "added" && (
                            <span className="rounded bg-emerald-50 px-1 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                                {t("version_sceneNew")}
                            </span>
                        )}
                        {scene.status === "removed" && (
                            <span className="rounded bg-red-50 px-1 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-950 dark:text-red-400">
                                {t("version_sceneDeleted")}
                            </span>
                        )}
                        <h3 className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-200">
                            {scene.title}
                        </h3>
                    </header>
                    <DiffLines lines={scene.lines} />
                </section>
            ))}
        </div>
    );
}
