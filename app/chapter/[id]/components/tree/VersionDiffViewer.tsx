"use client";

import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import {
    type AlignedRow,
    alignDiff,
    type SceneDiff,
} from "@/app/(shared)/utils/diff";

interface Props {
    diffs: SceneDiff[];
    versionLabel: string;
}

// 문단 단위로만 옅게 칠한다. 글자 단위 강조는 본문 읽기를 방해해서 쓰지 않는다.
const CHANGED_BG =
    "bg-amber-50/80 dark:bg-amber-950/25 rounded-sm ring-1 ring-inset ring-amber-200/60 dark:ring-amber-900/40";

function Paragraph({
    text,
    highlight,
}: {
    text: string | undefined;
    highlight: boolean;
}) {
    if (text === undefined) {
        // 반대편에만 있는 문단 — 자리만 비워 두 열의 줄이 어긋나지 않게 한다
        return <div className="min-h-[1.5rem]" aria-hidden="true" />;
    }
    return (
        <div
            className={`whitespace-pre-wrap break-words px-2 py-1 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 ${
                highlight ? CHANGED_BG : ""
            }`}
        >
            {text}
        </div>
    );
}

function SceneRows({ rows }: { rows: AlignedRow[] }) {
    return (
        <div className="flex flex-col gap-1">
            {rows.map((row, i) => (
                <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: diff 행은 순서가 고정
                    key={i}
                    className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2"
                >
                    <Paragraph
                        text={row.left}
                        highlight={row.type !== "same"}
                    />
                    <Paragraph
                        text={row.right}
                        highlight={row.type !== "same"}
                    />
                </div>
            ))}
        </div>
    );
}

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
            {/* 두 열의 머리말 — 스크롤해도 어느 쪽이 현재인지 보이게 고정 */}
            <div className="sticky top-0 z-10 grid grid-cols-1 gap-x-3 bg-white pb-2 pt-1 sm:grid-cols-2 dark:bg-zinc-900">
                <span className="px-2 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
                    {t("version_paneCurrent")}
                </span>
                <span className="px-2 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                    {versionLabel}
                </span>
            </div>

            <p className="px-2 text-xs text-zinc-400">
                {t("version_changedScenes", { n: changed.length })}
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
                    <SceneRows rows={alignDiff(scene.lines)} />
                </section>
            ))}
        </div>
    );
}
