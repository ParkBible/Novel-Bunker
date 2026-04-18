"use client";

import { History, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { SnapshotInfo } from "@/app/(shared)/utils/googleDrive";

function formatDate(date: Date): string {
    return date.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

interface Props {
    loadSnapshots: () => Promise<SnapshotInfo[]>;
    restoreSnapshot: (fileId: string) => Promise<void>;
    deleteSnapshot: (fileId: string) => Promise<void>;
    onClose: () => void;
}

export function SnapshotModal({
    loadSnapshots,
    restoreSnapshot,
    deleteSnapshot,
    onClose,
}: Props) {
    const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(
        null,
    );

    useEffect(() => {
        loadSnapshots()
            .then(setSnapshots)
            .catch((e) =>
                setError(e instanceof Error ? e.message : "불러오기 실패"),
            )
            .finally(() => setLoading(false));
    }, [loadSnapshots]);

    const handleRestore = async (id: string) => {
        setRestoringId(id);
        setError(null);
        try {
            await restoreSnapshot(id);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "복원 실패");
            setRestoringId(null);
        }
        setConfirmRestoreId(null);
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        setError(null);
        try {
            await deleteSnapshot(id);
            setSnapshots((prev) => prev.filter((s) => s.id !== id));
        } catch (e) {
            setError(e instanceof Error ? e.message : "삭제 실패");
        }
        setDeletingId(null);
    };

    const isBusy = restoringId !== null || deletingId !== null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
                aria-label="모달 닫기"
            />
            <div className="relative z-10 flex max-h-[80vh] w-full max-w-sm flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                {/* 헤더 */}
                <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                        <History className="size-4 text-zinc-400" />
                        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            버전 기록
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* 본문 */}
                <div className="flex-1 overflow-y-auto px-5 py-3">
                    {loading && (
                        <p className="py-6 text-center text-xs text-zinc-400">
                            불러오는 중...
                        </p>
                    )}
                    {!loading && error && (
                        <p className="py-6 text-center text-xs text-red-500">
                            {error}
                        </p>
                    )}
                    {!loading && !error && snapshots.length === 0 && (
                        <p className="py-6 text-center text-xs text-zinc-400">
                            저장된 버전이 없습니다.
                            <br />
                            업로드 시 자동으로 생성됩니다.
                        </p>
                    )}
                    {!loading && snapshots.length > 0 && (
                        <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                            {snapshots.map((snap) => (
                                <li key={snap.id} className="py-3">
                                    {confirmRestoreId === snap.id ? (
                                        <div className="flex flex-col gap-2">
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                이 버전으로 복원하면 현재 로컬
                                                데이터를 덮어씁니다.
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleRestore(snap.id)
                                                    }
                                                    disabled={isBusy}
                                                    className="flex-1 rounded bg-zinc-800 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                                                >
                                                    {restoringId === snap.id
                                                        ? "복원 중..."
                                                        : "확인"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setConfirmRestoreId(
                                                            null,
                                                        )
                                                    }
                                                    disabled={isBusy}
                                                    className="flex-1 rounded bg-zinc-100 px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                                >
                                                    취소
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                                                        snap.type === "manual"
                                                            ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                                            : "bg-blue-50 text-blue-500 dark:bg-blue-950/60 dark:text-blue-400"
                                                    }`}
                                                >
                                                    {snap.type === "manual"
                                                        ? "수동"
                                                        : "자동"}
                                                </span>
                                                <span className="text-xs text-zinc-600 dark:text-zinc-300">
                                                    {formatDate(snap.createdAt)}
                                                </span>
                                            </div>
                                            <div className="flex shrink-0 gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setConfirmRestoreId(
                                                            snap.id,
                                                        )
                                                    }
                                                    disabled={isBusy}
                                                    title="이 버전으로 복원"
                                                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                                                >
                                                    <RotateCcw className="size-3" />
                                                    복원
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDelete(snap.id)
                                                    }
                                                    disabled={isBusy}
                                                    title="스냅샷 삭제"
                                                    className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40 dark:hover:bg-red-950"
                                                >
                                                    {deletingId === snap.id ? (
                                                        <span className="text-xs">
                                                            ...
                                                        </span>
                                                    ) : (
                                                        <Trash2 className="size-3" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    {!loading && error && snapshots.length > 0 && (
                        <p className="mt-2 text-center text-xs text-red-500">
                            {error}
                        </p>
                    )}
                </div>

                {/* 푸터 */}
                <div className="border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
                    <p className="text-center text-xs text-zinc-400">
                        업로드할 때마다 자동 저장 · 최대 {5}개 유지
                    </p>
                </div>
            </div>
        </div>
    );
}
