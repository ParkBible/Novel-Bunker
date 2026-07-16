"use client";

import { GitCompare, History, RotateCcw, Save, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type SnapshotMeta, snapshotOps } from "@/app/(shared)/db/snapshots";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { diffScenes, type SceneDiff } from "@/app/(shared)/utils/diff";

function formatDate(date: Date): string {
    return date.toLocaleString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

interface Props {
    onClose: () => void;
}

interface ComparePair {
    older: SnapshotMeta;
    newer: SnapshotMeta;
    diffs: SceneDiff[];
}

export function VersionHistoryModal({ onClose }: Props) {
    const t = useTranslation();
    const { loadData } = useEditorStore();

    const [metas, setMetas] = useState<SnapshotMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [selected, setSelected] = useState<number[]>([]);
    const [compare, setCompare] = useState<ComparePair | null>(null);
    const [expandedScene, setExpandedScene] = useState<number | null>(null);
    const [confirmRestoreId, setConfirmRestoreId] = useState<number | null>(
        null,
    );

    const reload = useCallback(() => {
        setLoading(true);
        snapshotOps
            .list()
            .then(setMetas)
            .catch(() => setError(t("version_loadError")))
            .finally(() => setLoading(false));
    }, [t]);

    useEffect(() => {
        reload();
    }, [reload]);

    const toggleSelect = (id: number) => {
        setSelected((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            if (prev.length >= 2) return [prev[1], id]; // 최근 선택 + 새 선택 유지
            return [...prev, id];
        });
    };

    const handleCompare = async () => {
        if (selected.length !== 2) return;
        setBusy(true);
        setError(null);
        try {
            const [id1, id2] = selected;
            const [data1, data2] = await Promise.all([
                snapshotOps.getData(id1),
                snapshotOps.getData(id2),
            ]);
            if (!data1 || !data2) throw new Error();
            const m1 = metas.find((m) => m.id === id1);
            const m2 = metas.find((m) => m.id === id2);
            if (!m1 || !m2) throw new Error();
            const firstIsOlder = m1.createdAt <= m2.createdAt;
            const older = firstIsOlder ? m1 : m2;
            const newer = firstIsOlder ? m2 : m1;
            const olderData = firstIsOlder ? data1 : data2;
            const newerData = firstIsOlder ? data2 : data1;
            setCompare({
                older,
                newer,
                diffs: diffScenes(olderData, newerData),
            });
            setExpandedScene(null);
        } catch {
            setError(t("version_loadError"));
        }
        setBusy(false);
    };

    const handleSaveNow = async () => {
        setBusy(true);
        try {
            await snapshotOps.create("manual");
            reload();
        } catch {
            setError(t("version_loadError"));
        }
        setBusy(false);
    };

    const handleRestore = async (id: number) => {
        setBusy(true);
        setError(null);
        try {
            // 복원 전 현재 상태를 히스토리에 보존 (덮어쓰기 대비)
            await snapshotOps.createAutoIfChanged();
            await snapshotOps.restore(id);
            await loadData();
            onClose();
        } catch {
            setError(t("version_restoreError"));
            setBusy(false);
        }
    };

    const changed =
        compare?.diffs.filter((d) => d.status !== "unchanged") ?? [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
                aria-label={t("snapshot_closeLabel")}
            />
            <div className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                {/* 헤더 */}
                <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                        <History className="size-4 text-zinc-400" />
                        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            {t("version_title")}
                        </h2>
                    </div>
                    <div className="flex items-center gap-1">
                        {!compare && (
                            <button
                                type="button"
                                onClick={handleSaveNow}
                                disabled={busy}
                                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                            >
                                <Save className="size-3.5" />
                                {busy
                                    ? t("version_saving")
                                    : t("version_saveNow")}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                </div>

                {/* 본문 */}
                <div className="flex-1 overflow-y-auto px-5 py-3">
                    {loading && (
                        <p className="py-6 text-center text-xs text-zinc-400">
                            {t("loading")}
                        </p>
                    )}
                    {!loading && error && (
                        <p className="py-3 text-center text-xs text-red-500">
                            {error}
                        </p>
                    )}

                    {/* 목록 뷰 */}
                    {!loading &&
                        !compare &&
                        (metas.length === 0 ? (
                            <p className="py-6 text-center text-xs text-zinc-400">
                                {t("version_empty")}
                            </p>
                        ) : (
                            <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                                {metas.map((snap) => {
                                    const selIndex = selected.indexOf(snap.id);
                                    const isSelected = selIndex !== -1;
                                    return (
                                        <li
                                            key={snap.id}
                                            className="flex items-center justify-between gap-2 py-2.5"
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleSelect(snap.id)
                                                }
                                                className="flex flex-1 items-center gap-2 text-left"
                                            >
                                                <span
                                                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                                                        isSelected
                                                            ? "border-blue-500 bg-blue-500 text-white"
                                                            : "border-zinc-300 text-transparent dark:border-zinc-600"
                                                    }`}
                                                >
                                                    {isSelected
                                                        ? selIndex + 1
                                                        : ""}
                                                </span>
                                                <span
                                                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                                                        snap.type === "manual"
                                                            ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                                            : "bg-blue-50 text-blue-500 dark:bg-blue-950/60 dark:text-blue-400"
                                                    }`}
                                                >
                                                    {snap.type === "manual"
                                                        ? t("snapshot_manual")
                                                        : t("snapshot_auto")}
                                                </span>
                                                <span className="text-xs text-zinc-600 dark:text-zinc-300">
                                                    {formatDate(snap.createdAt)}
                                                </span>
                                            </button>
                                            {confirmRestoreId === snap.id ? (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleRestore(
                                                                snap.id,
                                                            )
                                                        }
                                                        disabled={busy}
                                                        className="rounded bg-zinc-800 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900"
                                                    >
                                                        {busy
                                                            ? t("restoring")
                                                            : t("confirm")}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setConfirmRestoreId(
                                                                null,
                                                            )
                                                        }
                                                        disabled={busy}
                                                        className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300"
                                                    >
                                                        {t("cancel")}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setConfirmRestoreId(
                                                            snap.id,
                                                        )
                                                    }
                                                    disabled={busy}
                                                    title={t(
                                                        "version_restoreThis",
                                                    )}
                                                    className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                                                >
                                                    <RotateCcw className="size-3" />
                                                    {t("restore")}
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        ))}

                    {/* 비교 뷰 */}
                    {!loading && compare && (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-center gap-2 rounded-lg bg-zinc-50 py-2 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                                <span>
                                    {t("version_older")}:{" "}
                                    {formatDate(compare.older.createdAt)}
                                </span>
                                <span>→</span>
                                <span>
                                    {t("version_newer")}:{" "}
                                    {formatDate(compare.newer.createdAt)}
                                </span>
                            </div>

                            {changed.length === 0 ? (
                                <p className="py-6 text-center text-xs text-zinc-400">
                                    {t("version_noChanges")}
                                </p>
                            ) : (
                                <>
                                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                        {t("version_changedScenes", {
                                            n: changed.length,
                                        })}
                                    </p>
                                    <ul className="flex flex-col gap-1.5">
                                        {changed.map((d) => (
                                            <li
                                                key={d.sceneId}
                                                className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExpandedScene(
                                                            expandedScene ===
                                                                d.sceneId
                                                                ? null
                                                                : d.sceneId,
                                                        )
                                                    }
                                                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                                >
                                                    <span className="flex items-center gap-1.5 truncate">
                                                        {d.status ===
                                                            "added" && (
                                                            <span className="rounded bg-emerald-50 px-1 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                                                                {t(
                                                                    "version_sceneNew",
                                                                )}
                                                            </span>
                                                        )}
                                                        {d.status ===
                                                            "removed" && (
                                                            <span className="rounded bg-red-50 px-1 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-950 dark:text-red-400">
                                                                {t(
                                                                    "version_sceneDeleted",
                                                                )}
                                                            </span>
                                                        )}
                                                        <span className="truncate text-xs text-zinc-700 dark:text-zinc-200">
                                                            {d.title}
                                                        </span>
                                                    </span>
                                                    <span className="flex shrink-0 items-center gap-1.5 text-xs">
                                                        {d.added > 0 && (
                                                            <span className="text-emerald-600 dark:text-emerald-400">
                                                                +{d.added}
                                                            </span>
                                                        )}
                                                        {d.removed > 0 && (
                                                            <span className="text-red-500">
                                                                -{d.removed}
                                                            </span>
                                                        )}
                                                    </span>
                                                </button>
                                                {expandedScene ===
                                                    d.sceneId && (
                                                    <div className="border-t border-zinc-100 bg-zinc-50/60 px-2 py-2 dark:border-zinc-800 dark:bg-zinc-950/40">
                                                        {d.lines.map(
                                                            (line, i) => (
                                                                <div
                                                                    // biome-ignore lint/suspicious/noArrayIndexKey: diff 줄은 순서 고정
                                                                    key={i}
                                                                    className={`whitespace-pre-wrap break-words px-1.5 py-0.5 text-xs leading-relaxed ${
                                                                        line.type ===
                                                                        "add"
                                                                            ? "bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                                                            : line.type ===
                                                                                "del"
                                                                              ? "bg-red-100/70 text-red-700 line-through dark:bg-red-950/50 dark:text-red-300"
                                                                              : "text-zinc-500 dark:text-zinc-400"
                                                                    }`}
                                                                >
                                                                    <span className="mr-1 select-none opacity-50">
                                                                        {line.type ===
                                                                        "add"
                                                                            ? "+"
                                                                            : line.type ===
                                                                                "del"
                                                                              ? "-"
                                                                              : " "}
                                                                    </span>
                                                                    {line.text}
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleRestore(compare.newer.id)
                                        }
                                        disabled={busy}
                                        className="mt-1 flex items-center justify-center gap-1 rounded-lg bg-zinc-800 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                                    >
                                        <RotateCcw className="size-3.5" />
                                        {busy
                                            ? t("restoring")
                                            : `${t("version_newer")} ${t("version_restoreThis")}`}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div className="border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
                    {compare ? (
                        <button
                            type="button"
                            onClick={() => setCompare(null)}
                            className="w-full rounded-lg bg-zinc-100 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                            {t("version_back")}
                        </button>
                    ) : selected.length === 2 ? (
                        <button
                            type="button"
                            onClick={handleCompare}
                            disabled={busy}
                            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                            <GitCompare className="size-3.5" />
                            {t("version_compare")}
                        </button>
                    ) : (
                        <p className="text-center text-xs text-zinc-400">
                            {selected.length === 1
                                ? t("version_selectedCount", { n: 1 })
                                : t("version_selectTwo")}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
