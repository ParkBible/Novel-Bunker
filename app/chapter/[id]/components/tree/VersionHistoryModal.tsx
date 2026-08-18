"use client";

import { Cloud, History, Laptop, RotateCcw, Save, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type BackupData, collectLocalData } from "@/app/(shared)/db/backup";
import { chapterOps } from "@/app/(shared)/db/operations";
import { snapshotOps } from "@/app/(shared)/db/snapshots";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { routes } from "@/app/(shared)/routes";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { diffScenes, type SceneDiff } from "@/app/(shared)/utils/diff";
import {
    createSnapshotNow,
    deleteSnapshot,
    getAccessToken,
    getSnapshotData,
    listSnapshots,
    restoreSnapshot,
} from "@/app/(shared)/utils/googleDrive";
import { VersionDiffViewer } from "./VersionDiffViewer";
import { type TimelineEntry, VersionTimeline } from "./VersionTimeline";

function formatDate(date: Date): string {
    return date.toLocaleString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        // 오전/오후 대신 24시간제 (hour12:false는 자정을 24:00으로 쓰는 엔진이 있어 h23 지정)
        hourCycle: "h23",
    });
}

// 로컬(IndexedDB)과 Drive(기기간) 두 저장소를 같은 UI에서 다루기 위한 추상화.
// 글자 변화량·발췌는 로컬 스냅샷에만 있어 Drive 기록에서는 비어 있다.
type HistoryEntry = TimelineEntry;

interface HistorySource {
    isCloud: boolean;
    list: () => Promise<HistoryEntry[]>;
    getData: (id: string) => Promise<BackupData | null>;
    // 데이터만 로컬 DB에 적용 (loadData는 호출부에서)
    restore: (id: string) => Promise<void>;
    remove: (id: string) => Promise<void>;
    saveNow: () => Promise<void>;
}

const localSource: HistorySource = {
    isCloud: false,
    list: async () =>
        (await snapshotOps.list()).map((m) => ({
            id: String(m.id),
            createdAt: m.createdAt,
            type: m.type,
            label: m.label,
            added: m.added,
            removed: m.removed,
            excerpt: m.excerpt,
        })),
    getData: (id) => snapshotOps.getData(Number(id)),
    restore: (id) => snapshotOps.restore(Number(id)),
    remove: (id) => snapshotOps.delete(Number(id)),
    saveNow: async () => {
        await snapshotOps.create("manual");
    },
};

const cloudSource: HistorySource = {
    isCloud: true,
    list: async () =>
        (await listSnapshots()).map((s) => ({
            id: s.id,
            createdAt: s.createdAt,
            type: s.type,
        })),
    getData: (id) => getSnapshotData(id),
    restore: (id) => restoreSnapshot(id),
    remove: (id) => deleteSnapshot(id),
    saveNow: () => createSnapshotNow(),
};

interface Props {
    onClose: () => void;
}

// 선택한 버전(이전) ↔ 현재 상태(이후) 비교 결과
interface CompareResult {
    entry: HistoryEntry;
    diffs: SceneDiff[];
}

export function VersionHistoryModal({ onClose }: Props) {
    const t = useTranslation();
    const params = useParams();
    const router = useRouter();
    const { loadData } = useEditorStore();

    // Drive에 연결돼 있으면 기기간 공유 기록, 아니면 이 기기의 로컬 기록으로 폴백
    const source = useMemo<HistorySource>(
        () => (getAccessToken() ? cloudSource : localSource),
        [],
    );

    const [metas, setMetas] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [compare, setCompare] = useState<CompareResult | null>(null);
    const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(
        null,
    );

    const reload = useCallback(() => {
        setLoading(true);
        source
            .list()
            .then(setMetas)
            .catch(() => setError(t("version_loadError")))
            .finally(() => setLoading(false));
    }, [source, t]);

    useEffect(() => {
        reload();
    }, [reload]);

    // 선택한 버전을 "현재 상태"와 비교 (버전=이전, 현재=이후)
    const handleCompare = async (entry: HistoryEntry) => {
        setBusy(true);
        setError(null);
        try {
            const [versionData, currentData] = await Promise.all([
                source.getData(entry.id),
                collectLocalData(),
            ]);
            if (!versionData) throw new Error();
            setCompare({
                entry,
                diffs: diffScenes(versionData, currentData),
            });
            setConfirmRestoreId(null);
        } catch {
            setError(t("version_loadError"));
        }
        setBusy(false);
    };

    const handleSaveNow = async () => {
        setBusy(true);
        setError(null);
        try {
            await source.saveNow();
            reload();
        } catch {
            setError(t("version_loadError"));
        }
        setBusy(false);
    };

    const handleDelete = async (id: string) => {
        setBusy(true);
        setError(null);
        try {
            await source.remove(id);
            setMetas((prev) => prev.filter((m) => m.id !== id));
        } catch {
            setError(t("version_loadError"));
        }
        setBusy(false);
    };

    const handleRestore = async (id: string) => {
        setBusy(true);
        setError(null);
        try {
            // 복원 전 현재 상태를 로컬 히스토리에 보존 (덮어쓰기 대비 안전망)
            await snapshotOps.createAutoIfChanged();
            await source.restore(id);

            // 보고 있던 챕터가 복원 데이터에 그대로 있으면 그 작품을 유지
            // 로드해 현재 위치를 지킨다. 사라졌을 때만 활성 작품을 로드하고
            // 안전한 경로로 이동. (다른 작품/첫 작품으로 튕기는 문제 방지)
            const currentChapterId =
                typeof params.id === "string"
                    ? Number.parseInt(params.id, 10)
                    : null;
            const survivingProjectId =
                currentChapterId !== null
                    ? await chapterOps.getProjectId(currentChapterId)
                    : undefined;
            if (survivingProjectId !== undefined) {
                await loadData(survivingProjectId);
            } else {
                await loadData();
                const restoredChapters = useEditorStore.getState().chapters;
                if (restoredChapters.length > 0) {
                    const firstChapter = [...restoredChapters].sort(
                        (a, b) => a.order - b.order,
                    )[0];
                    router.push(routes.chapter(firstChapter.id as number));
                } else {
                    router.push(routes.home);
                }
            }

            onClose();
        } catch {
            setError(t("version_restoreError"));
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
                aria-label={t("snapshot_closeLabel")}
            />
            <div className="relative z-10 flex max-h-[85vh] w-full max-w-5xl flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                {/* 헤더 */}
                <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                        <History className="size-4 text-zinc-400" />
                        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            {t("version_title")}
                        </h2>
                        <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            {source.isCloud ? (
                                <Cloud className="size-3" />
                            ) : (
                                <Laptop className="size-3" />
                            )}
                            {source.isCloud
                                ? t("version_scopeCloud")
                                : t("version_scopeLocal")}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={handleSaveNow}
                            disabled={busy}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        >
                            <Save className="size-3.5" />
                            {busy ? t("version_saving") : t("version_saveNow")}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                </div>

                {/* 본문: 좌측 비교 뷰어 + 우측 타임라인 */}
                <div className="flex min-h-0 flex-1 flex-col-reverse lg:flex-row">
                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                        {loading && (
                            <p className="py-10 text-center text-xs text-zinc-400">
                                {t("loading")}
                            </p>
                        )}
                        {!loading && error && (
                            <p className="py-3 text-center text-xs text-red-500">
                                {error}
                            </p>
                        )}
                        {!loading && !error && !compare && (
                            <p className="py-10 text-center text-xs text-zinc-400">
                                {metas.length === 0
                                    ? source.isCloud
                                        ? t("snapshot_empty")
                                        : t("version_empty")
                                    : t("version_selectFromTimeline")}
                            </p>
                        )}
                        {!loading && compare && (
                            <>
                                <VersionDiffViewer
                                    diffs={compare.diffs}
                                    versionLabel={formatDate(
                                        compare.entry.createdAt,
                                    )}
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleRestore(compare.entry.id)
                                    }
                                    disabled={busy}
                                    className="mt-5 flex w-full items-center justify-center gap-1 rounded-lg bg-zinc-800 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                                >
                                    <RotateCcw className="size-3.5" />
                                    {busy
                                        ? t("restoring")
                                        : t("version_restoreThis")}
                                </button>
                            </>
                        )}
                    </div>

                    <aside className="flex max-h-56 shrink-0 flex-col overflow-y-auto border-b border-zinc-100 lg:max-h-none lg:w-72 lg:border-b-0 lg:border-l dark:border-zinc-800">
                        <div className="sticky top-0 z-20 border-b border-zinc-100 bg-white px-3 py-2 text-[10px] font-semibold tracking-wide text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
                            {t("version_timeline")}
                        </div>
                        {metas.length === 0 ? (
                            <p className="px-3 py-6 text-center text-xs text-zinc-400">
                                {source.isCloud
                                    ? t("snapshot_empty")
                                    : t("version_empty")}
                            </p>
                        ) : (
                            <VersionTimeline
                                entries={metas}
                                selectedId={compare?.entry.id ?? null}
                                busy={busy}
                                confirmRestoreId={confirmRestoreId}
                                onSelect={handleCompare}
                                onAskRestore={setConfirmRestoreId}
                                onRestore={handleRestore}
                                onDelete={handleDelete}
                            />
                        )}
                    </aside>
                </div>

                {/* 푸터 */}
                <div className="border-t border-zinc-100 px-5 py-2.5 dark:border-zinc-800">
                    <p className="text-center text-[11px] text-zinc-400">
                        {t("version_footer")}
                    </p>
                </div>
            </div>
        </div>
    );
}
