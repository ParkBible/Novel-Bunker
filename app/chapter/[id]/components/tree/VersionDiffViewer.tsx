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

// diffScenes는 제목 변경도 잡으려고 본문 앞에 "# 제목" 줄을 끼워 넣는다.
// 섹션 머리말에 제목이 이미 있으므로, 그대로면 감추고 바뀐 경우만 남긴다.
const TITLE_LINE = /^# /;

// 선택한 버전의 본문만 보여 준다. 현재 내용과 다른 문단에만 배경을 깐다.
// (현재 내용은 에디터에서 바로 볼 수 있으니 굳이 나란히 띄우지 않는다)
function SceneRows({ rows }: { rows: AlignedRow[] }) {
    const paragraphs = rows.filter(
        (row) =>
            row.right !== undefined &&
            !(row.type === "same" && TITLE_LINE.test(row.right)),
    );

    return (
        <div className="flex flex-col gap-1">
            {paragraphs.map((row, i) => (
                <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: diff 행은 순서가 고정
                    key={i}
                    className={`whitespace-pre-wrap break-words px-2 py-1 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 ${
                        row.type !== "same" ? CHANGED_BG : ""
                    }`}
                >
                    {row.right}
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
            {/* 어느 시점의 원고를 보고 있는지 스크롤해도 보이게 고정 */}
            <div className="sticky top-0 z-10 flex items-baseline gap-2 bg-white pb-2 pt-1 dark:bg-zinc-900">
                <span className="px-2 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
                    {versionLabel}
                </span>
                <span className="text-[11px] text-zinc-400">
                    {t("version_changedScenes", { n: changed.length })}
                </span>
            </div>

            <p className="px-2 text-[11px] text-zinc-400">
                {t("version_highlightHint")}
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
