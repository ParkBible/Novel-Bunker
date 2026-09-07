"use client";

import { ChevronDown, ChevronRight, FileText, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import type {
    ProjectDiff,
    ProjectDiffStatus,
    SceneChange,
} from "@/app/(shared)/utils/projectDiff";
import { DiffLines } from "./DiffLines";

// Drive 받기 확인 모달에 들어가는 "무엇이 바뀌는가" 미리보기.
// Drive 백업은 DB 전체를 덮어쓰므로, 지금 보고 있지 않은 작품까지 바뀐다는
// 사실이 드러나도록 작품 단위로 갈라서 보여준다.

interface Props {
    diffs: ProjectDiff[];
}

const STATUS_BADGE: Record<
    Exclude<ProjectDiffStatus, "modified">,
    {
        key: "drive_workAdded" | "drive_workRemoved" | "drive_workUnchanged";
        className: string;
    }
> = {
    added: {
        key: "drive_workAdded",
        className:
            "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    },
    removed: {
        key: "drive_workRemoved",
        className: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    },
    unchanged: {
        key: "drive_workUnchanged",
        className:
            "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
    },
};

const SCENE_BADGE: Record<string, string> = {
    added: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    removed: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    modified: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

function CharDelta({ added, removed }: { added: number; removed: number }) {
    const t = useTranslation();
    if (!added && !removed) return null;
    return (
        <span className="flex items-center gap-1.5 text-[11px] font-medium tabular-nums">
            {!!added && (
                <span className="text-emerald-600 dark:text-emerald-400">
                    {t("drive_charsAdded", { n: added.toLocaleString() })}
                </span>
            )}
            {!!removed && (
                <span className="text-red-500 dark:text-red-400">
                    {t("drive_charsRemoved", { n: removed.toLocaleString() })}
                </span>
            )}
        </span>
    );
}

function SceneRow({ change }: { change: SceneChange }) {
    const t = useTranslation();
    const [open, setOpen] = useState(false);
    const { diff, chapterTitle } = change;

    const statusLabel =
        diff.status === "added"
            ? t("version_sceneNew")
            : diff.status === "removed"
              ? t("version_sceneDeleted")
              : t("drive_sceneModified");

    return (
        <li className="border-t border-zinc-100 first:border-t-0 dark:border-zinc-800">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                title={
                    open
                        ? t("drive_previewHideDiff")
                        : t("drive_previewShowDiff")
                }
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
                {open ? (
                    <ChevronDown className="size-3 shrink-0 text-zinc-400" />
                ) : (
                    <ChevronRight className="size-3 shrink-0 text-zinc-400" />
                )}
                <span className="truncate text-[11px] text-zinc-400">
                    {chapterTitle.trim() || t("drive_untitledChapter")}
                </span>
                <span className="truncate text-xs text-zinc-700 dark:text-zinc-200">
                    {diff.title.trim() || t("version_untitledScene")}
                </span>
                <span
                    className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-medium ${SCENE_BADGE[diff.status]}`}
                >
                    {statusLabel}
                </span>
                <span className="ml-auto shrink-0">
                    <CharDelta
                        added={change.addedChars}
                        removed={change.removedChars}
                    />
                </span>
            </button>
            {open && (
                <div className="border-t border-zinc-100 bg-zinc-50/60 py-1 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <DiffLines lines={diff.lines} />
                </div>
            )}
        </li>
    );
}

function ProjectSection({ project }: { project: ProjectDiff }) {
    const t = useTranslation();
    const badge =
        project.status === "modified" ? null : STATUS_BADGE[project.status];

    return (
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-700">
            <header className="flex items-center gap-1.5 px-2.5 py-2">
                <FileText className="size-3.5 shrink-0 text-zinc-400" />
                <h3 className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                    {project.title.trim() || t("drive_untitledWork")}
                </h3>
                {badge && (
                    <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}
                    >
                        {t(badge.key)}
                    </span>
                )}
                <span className="ml-auto shrink-0">
                    <CharDelta
                        added={project.addedChars}
                        removed={project.removedChars}
                    />
                </span>
            </header>
            {project.changedScenes.length > 0 && (
                <ul className="border-t border-zinc-100 dark:border-zinc-800">
                    {project.changedScenes.map((change) => (
                        <SceneRow key={change.diff.sceneId} change={change} />
                    ))}
                </ul>
            )}
        </section>
    );
}

export function DriveDownloadPreview({ diffs }: Props) {
    const t = useTranslation();
    const changed = diffs.filter((d) => d.status !== "unchanged");
    const unchanged = diffs.filter((d) => d.status === "unchanged");

    if (changed.length === 0) {
        return (
            <p className="py-6 text-center text-xs text-zinc-400">
                {t("drive_previewNoChanges")}
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <p className="flex flex-wrap items-center gap-x-3 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                    <Plus className="size-3 text-emerald-500" />
                    {t("drive_legendAdded")}
                </span>
                <span className="flex items-center gap-1">
                    <Minus className="size-3 text-red-400" />
                    {t("drive_legendRemoved")}
                </span>
            </p>

            {changed.map((project) => (
                <ProjectSection key={project.projectId} project={project} />
            ))}

            {/* 안 바뀌는 작품도 한 줄씩 남겨, 이 동기화의 범위가 전체라는 게 보이게 한다 */}
            {unchanged.map((project) => (
                <p
                    key={project.projectId}
                    className="flex items-center gap-1.5 px-2.5 text-[11px] text-zinc-400 dark:text-zinc-500"
                >
                    <FileText className="size-3 shrink-0" />
                    <span className="truncate">
                        {project.title.trim() || t("drive_untitledWork")}
                    </span>
                    <span className="ml-auto shrink-0">
                        {t("drive_workUnchanged")}
                    </span>
                </p>
            ))}
        </div>
    );
}
