"use client";

import { AlertTriangle, Download, History, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useGoogleDrive } from "@/app/(shared)/hooks/useGoogleDrive";
import { isLocalDataEmpty } from "@/app/(shared)/utils/googleDrive";
import { ClientIdGuideModal } from "./ClientIdGuideModal";
import { SnapshotModal } from "./SnapshotModal";

const SETTINGS_KEY = "googleClientId";

function formatRelativeTime(date: Date): string {
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
    const diffHour = Math.floor(diffMin / 60);
    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    return `${Math.floor(diffHour / 24)}일 전`;
}

type ConfirmKind = "upload" | "download" | null;

interface UploadConfirmState {
    isEmpty: boolean;
    checked: boolean;
}

export function DriveSync() {
    const [clientId, setClientId] = useState<string | null>(null);
    const [isEditingClientId, setIsEditingClientId] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [gisReady, setGisReady] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showSnapshots, setShowSnapshots] = useState(false);
    const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
    const [uploadConfirm, setUploadConfirm] = useState<UploadConfirmState>({
        isEmpty: false,
        checked: false,
    });
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (window.google) {
            setGisReady(true);
            return;
        }
        const handler = () => setGisReady(true);
        window.addEventListener("gis-loaded", handler);
        return () => window.removeEventListener("gis-loaded", handler);
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) setClientId(saved);
    }, []);

    useEffect(() => {
        if (isEditingClientId) inputRef.current?.focus();
    }, [isEditingClientId]);

    const handleSaveClientId = () => {
        const trimmed = inputValue.trim();
        if (!trimmed) return;
        localStorage.setItem(SETTINGS_KEY, trimmed);
        setClientId(trimmed);
        setIsEditingClientId(false);
        setInputValue("");
    };

    const {
        isConnected,
        syncStatus,
        errorMessage,
        lastSyncedAt,
        upload,
        download,
        disconnect,
        loadSnapshots,
        restoreSnapshot,
        deleteSnapshot,
    } = useGoogleDrive(clientId ?? "");

    const [, forceUpdate] = useState(0);
    useEffect(() => {
        if (!lastSyncedAt) return;
        const id = setInterval(() => forceUpdate((n) => n + 1), 60_000);
        return () => clearInterval(id);
    }, [lastSyncedAt]);

    const isSyncing = syncStatus === "syncing";

    const openUploadConfirm = async () => {
        setUploadConfirm({ isEmpty: false, checked: false });
        setConfirmKind("upload");
        const empty = await isLocalDataEmpty();
        setUploadConfirm({ isEmpty: empty, checked: true });
    };

    const openDownloadConfirm = () => {
        setConfirmKind("download");
    };

    const handleConfirmUpload = () => {
        setConfirmKind(null);
        upload();
    };

    const handleConfirmDownload = () => {
        setConfirmKind(null);
        download();
    };

    if (!gisReady) return null;

    if (!clientId || isEditingClientId) {
        return (
            <>
                <div className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Google Drive 백업
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowGuide(true)}
                                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                title="발급 방법 안내"
                            >
                                발급 방법
                            </button>
                            {isEditingClientId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditingClientId(false);
                                        setInputValue("");
                                    }}
                                    className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                >
                                    취소
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="mb-2 text-xs text-zinc-400 dark:text-zinc-500">
                        Google Cloud Console에서 발급한 OAuth 2.0 클라이언트
                        ID를 입력하세요.
                    </p>
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) =>
                            e.key === "Enter" && handleSaveClientId()
                        }
                        placeholder="xxxxx.apps.googleusercontent.com"
                        className="mb-1.5 w-full rounded border border-zinc-200 bg-transparent px-2 py-1 text-xs text-zinc-700 placeholder-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:placeholder-zinc-600"
                    />
                    <button
                        type="button"
                        onClick={handleSaveClientId}
                        disabled={!inputValue.trim()}
                        className="w-full rounded bg-zinc-100 px-2 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                        저장
                    </button>
                </div>
                {showGuide && (
                    <ClientIdGuideModal onClose={() => setShowGuide(false)} />
                )}
            </>
        );
    }

    return (
        <>
            <div className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Google Drive 백업
                    </span>
                    <div className="flex gap-2">
                        {isConnected && (
                            <button
                                type="button"
                                onClick={disconnect}
                                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            >
                                연결 해제
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setInputValue(clientId);
                                setIsEditingClientId(true);
                            }}
                            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        >
                            설정
                        </button>
                    </div>
                </div>

                <div className="flex gap-1.5">
                    <button
                        type="button"
                        onClick={openUploadConfirm}
                        disabled={isSyncing}
                        className="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        title="로컬 데이터를 Drive에 업로드"
                    >
                        <Upload className="size-3.5" />
                        업로드
                    </button>
                    <button
                        type="button"
                        onClick={openDownloadConfirm}
                        disabled={isSyncing}
                        className="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        title="Drive에서 로컬로 다운로드"
                    >
                        <Download className="size-3.5" />
                        다운로드
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowSnapshots(true)}
                        disabled={isSyncing}
                        className="flex items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        title="버전 기록"
                    >
                        <History className="size-3.5" />
                    </button>
                </div>

                {!isConnected && lastSyncedAt && !isSyncing && (
                    <p className="mt-1 text-center text-xs text-amber-500 dark:text-amber-400">
                        자동 저장 일시정지 · 업로드로 재연결
                    </p>
                )}
                {isConnected &&
                    lastSyncedAt &&
                    !isSyncing &&
                    syncStatus !== "success" && (
                        <p className="mt-1 text-center text-xs text-zinc-400 dark:text-zinc-500">
                            마지막 동기화: {formatRelativeTime(lastSyncedAt)}
                        </p>
                    )}
                {isSyncing && (
                    <p className="mt-1 text-center text-xs text-zinc-400">
                        동기화 중...
                    </p>
                )}
                {syncStatus === "success" && (
                    <p className="mt-1 text-center text-xs text-emerald-500">
                        완료되었습니다
                    </p>
                )}
                {syncStatus === "error" && errorMessage && (
                    <p
                        className="mt-1 text-xs text-red-500"
                        title={errorMessage}
                    >
                        {errorMessage}
                    </p>
                )}
            </div>

            {/* 업로드 확인 모달 */}
            {confirmKind === "upload" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setConfirmKind(null)}
                        aria-label="모달 닫기"
                    />
                    <div className="relative z-10 w-full max-w-xs rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                        <h2 className="mb-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            Drive에 업로드
                        </h2>

                        {!uploadConfirm.checked ? (
                            <p className="mb-4 text-xs text-zinc-400">
                                확인 중...
                            </p>
                        ) : uploadConfirm.isEmpty ? (
                            <>
                                <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-950">
                                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-red-500" />
                                    <p className="text-xs leading-relaxed text-red-600 dark:text-red-400">
                                        로컬에 데이터가 없습니다. 업로드하면
                                        Drive의 기존 백업이 빈 데이터로
                                        덮어써집니다.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setConfirmKind(null)}
                                    className="w-full rounded-lg bg-zinc-100 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                >
                                    취소
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="mb-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                    현재 Drive 데이터는 스냅샷으로 저장된 뒤
                                    로컬 데이터로 덮어써집니다.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleConfirmUpload}
                                        className="flex-1 rounded-lg bg-zinc-800 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                                    >
                                        업로드
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmKind(null)}
                                        className="flex-1 rounded-lg bg-zinc-100 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                    >
                                        취소
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* 다운로드 확인 모달 */}
            {confirmKind === "download" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setConfirmKind(null)}
                        aria-label="모달 닫기"
                    />
                    <div className="relative z-10 w-full max-w-xs rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                        <h2 className="mb-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            Drive에서 다운로드
                        </h2>
                        <p className="mb-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                            Drive 데이터를 로컬에 복원합니다. 현재 로컬 데이터는
                            덮어써집니다.
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleConfirmDownload}
                                className="flex-1 rounded-lg bg-zinc-800 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                            >
                                다운로드
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmKind(null)}
                                className="flex-1 rounded-lg bg-zinc-100 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSnapshots && (
                <SnapshotModal
                    loadSnapshots={loadSnapshots}
                    restoreSnapshot={restoreSnapshot}
                    deleteSnapshot={deleteSnapshot}
                    onClose={() => setShowSnapshots(false)}
                />
            )}

            {showGuide && (
                <ClientIdGuideModal onClose={() => setShowGuide(false)} />
            )}
        </>
    );
}
