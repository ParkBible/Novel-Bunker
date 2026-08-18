"use client";

import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import type { DiffLine, SceneDiff } from "@/app/(shared)/utils/diff";

interface Props {
    diffs: SceneDiff[];
    versionLabel: string;
}

// GitHub식 통합(unified) diff — 한 열에 이전/이후를 섞어 놓고 색으로 구분한다.
// 선택한 버전이 "이전", 현재 원고가 "이후"다.
//   빨강(−) = 그 버전에 있었지만 지금은 없는 문단
//   초록(+) = 그 뒤에 새로 쓴 문단
// 강조는 문단 단위까지만 한다. 글자 단위로 쪼개면 본문이 읽히지 않는다.
const LINE_STYLE: Record<DiffLine["type"], string> = {
    del: "border-red-300 bg-red-50/70 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200",
    add: "border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
    same: "border-transparent text-zinc-600 dark:text-zinc-400",
};

const MARKER: Record<DiffLine["type"], string> = {
    del: "−",
    add: "+",
    same: "",
};

// diffScenes는 제목 변경도 잡으려고 본문 앞에 "# 제목" 줄을 끼워 넣는다.
// 섹션 머리말에 제목이 이미 있으므로, 그대로면 감추고 바뀐 경우만 남긴다.
const TITLE_LINE = /^# /;

function SceneRows({ lines }: { lines: DiffLine[] }) {
    const shown = lines.filter(
        (line) => !(line.type === "same" && TITLE_LINE.test(line.text)),
    );

    return (
        <div className="flex flex-col">
            {shown.map((line, i) => (
                <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: diff 줄은 순서가 고정
                    key={i}
                    className={`flex gap-1.5 border-l-2 px-2 py-1 text-xs leading-relaxed ${LINE_STYLE[line.type]}`}
                >
                    <span
                        aria-hidden="true"
                        className="w-2 shrink-0 select-none text-center opacity-60"
                    >
                        {MARKER[line.type]}
                    </span>
                    <span className="whitespace-pre-wrap break-words">
                        {line.text}
                    </span>
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
                    <SceneRows lines={scene.lines} />
                </section>
            ))}
        </div>
    );
}
