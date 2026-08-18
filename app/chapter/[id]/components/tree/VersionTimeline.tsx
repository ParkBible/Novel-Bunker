"use client";

import { Pin, RotateCcw, Trash2 } from "lucide-react";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";

// 로컬/Drive 공통 타임라인 항목. 요약 필드는 로컬 스냅샷에만 있다.
export interface TimelineEntry {
    id: string;
    createdAt: Date;
    type: "manual" | "auto";
    label?: string;
    added?: number;
    removed?: number;
    excerpt?: string;
}

interface Props {
    entries: TimelineEntry[];
    selectedId: string | null;
    busy: boolean;
    confirmRestoreId: string | null;
    onSelect: (entry: TimelineEntry) => void;
    onAskRestore: (id: string | null) => void;
    onRestore: (id: string) => void;
    onDelete: (id: string) => void;
}

function formatTime(date: Date): string {
    return date.toLocaleString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        // 오전/오후 대신 24시간제 (hour12:false는 자정을 24:00으로 쓰는 엔진이 있어 h23 지정)
        hourCycle: "h23",
    });
}

// 날짜가 바뀌는 지점에 구분선을 넣기 위한 키
function dayKey(date: Date): string {
    return date.toLocaleDateString("ko-KR");
}

export function VersionTimeline({
    entries,
    selectedId,
    busy,
    confirmRestoreId,
    onSelect,
    onAskRestore,
    onRestore,
    onDelete,
}: Props) {
    const t = useTranslation();

    return (
        <ul className="flex flex-col">
            {entries.map((entry, index) => {
                const isSelected = selectedId === entry.id;
                const isPinned = entry.type === "manual";
                const showDay =
                    index === 0 ||
                    dayKey(entries[index - 1].createdAt) !==
                        dayKey(entry.createdAt);

                return (
                    <li key={entry.id}>
                        {showDay && (
                            <div className="sticky top-0 z-10 bg-white px-3 py-1.5 text-[10px] font-medium tracking-wide text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">
                                {dayKey(entry.createdAt)}
                            </div>
                        )}
                        <div
                            className={`group relative border-l-2 transition-colors ${
                                isSelected
                                    ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/30"
                                    : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                            }`}
                        >
                            <button
                                type="button"
                                onClick={() => onSelect(entry)}
                                disabled={busy}
                                title={t("version_compareWithCurrent")}
                                className="flex w-full flex-col gap-1 px-3 py-2.5 text-left disabled:opacity-40"
                            >
                                <span className="flex items-center gap-1.5">
                                    {isPinned && (
                                        <Pin
                                            className="size-3 shrink-0 fill-amber-400 text-amber-500"
                                            aria-label={t(
                                                "version_manualPinned",
                                            )}
                                        />
                                    )}
                                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                                        {entry.label?.trim() ||
                                            formatTime(entry.createdAt)}
                                    </span>
                                    {entry.label?.trim() && (
                                        <span className="text-[10px] text-zinc-400">
                                            {formatTime(entry.createdAt)}
                                        </span>
                                    )}
                                </span>

                                {(entry.added || entry.removed) && (
                                    <span className="flex items-center gap-2 text-[11px] font-medium tabular-nums">
                                        {!!entry.added && (
                                            <span className="text-emerald-600 dark:text-emerald-400">
                                                +{entry.added.toLocaleString()}
                                                자
                                            </span>
                                        )}
                                        {!!entry.removed && (
                                            <span className="text-red-500 dark:text-red-400">
                                                −
                                                {entry.removed.toLocaleString()}
                                                자
                                            </span>
                                        )}
                                    </span>
                                )}

                                {entry.excerpt && (
                                    <span className="line-clamp-2 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                                        {entry.excerpt}
                                    </span>
                                )}
                            </button>

                            {confirmRestoreId === entry.id ? (
                                <div className="flex gap-1 px-3 pb-2.5">
                                    <button
                                        type="button"
                                        onClick={() => onRestore(entry.id)}
                                        disabled={busy}
                                        className="flex-1 rounded bg-zinc-800 px-2 py-1 text-[11px] font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900"
                                    >
                                        {busy ? t("restoring") : t("confirm")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onAskRestore(null)}
                                        disabled={busy}
                                        className="flex-1 rounded bg-zinc-100 px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300"
                                    >
                                        {t("cancel")}
                                    </button>
                                </div>
                            ) : (
                                <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                                    <button
                                        type="button"
                                        onClick={() => onAskRestore(entry.id)}
                                        disabled={busy}
                                        title={t("version_restoreThis")}
                                        className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-40 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                                    >
                                        <RotateCcw className="size-3" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDelete(entry.id)}
                                        disabled={busy}
                                        title={t("snapshot_deleteTitle")}
                                        className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 dark:hover:bg-red-950"
                                    >
                                        <Trash2 className="size-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
