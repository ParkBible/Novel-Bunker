"use client";

import { AlertTriangle, Download, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { collectLocalData } from "@/app/(shared)/db/backup";
import { useGoogleDrive } from "@/app/(shared)/hooks/useGoogleDrive";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import type { TranslationKey } from "@/app/(shared)/i18n/translations";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import {
    getAccessToken,
    isLocalDataEmpty,
    type RemoteBackup,
    redirectToAuth,
    savePendingAction,
} from "@/app/(shared)/utils/googleDrive";
import {
    diffByProject,
    type ProjectDiff,
} from "@/app/(shared)/utils/projectDiff";
import { ClientIdGuideModal } from "./ClientIdGuideModal";
import { DriveDownloadPreview } from "./DriveDownloadPreview";

const SETTINGS_KEY = "googleClientId";

type TFunction = (
    key: TranslationKey,
    params?: Record<string, string | number>,
) => string;

function formatRelativeTime(date: Date, t: TFunction): string {
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
    const diffHour = Math.floor(diffMin / 60);
    if (diffMin < 1) return t("drive_timeJustNow");
    if (diffMin < 60) return t("drive_timeMinutes", { n: diffMin });
    if (diffHour < 24) return t("drive_timeHours", { n: diffHour });
    return t("drive_timeDays", { n: Math.floor(diffHour / 24) });
}

type ConfirmKind = "upload" | "download" | null;

interface UploadConfirmState {
    isEmpty: boolean;
    checked: boolean;
}

// 받기 확인 모달의 미리보기 상태.
// authNeeded: 토큰이 없어 아직 원격을 읽을 수 없는 상태 — 받기를 누르면 로그인부터.
type DownloadPreview =
    | { state: "authNeeded" }
    | { state: "loading" }
    | { state: "error" }
    | { state: "ready"; diffs: ProjectDiff[]; remote: RemoteBackup };

export function DriveSync() {
    const t = useTranslation();
    const [clientId, setClientId] = useState<string | null>(null);
    const [isEditingClientId, setIsEditingClientId] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [showGuide, setShowGuide] = useState(false);
    const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
    const [uploadConfirm, setUploadConfirm] = useState<UploadConfirmState>({
        isEmpty: false,
        checked: false,
    });
    const [downloadPreview, setDownloadPreview] = useState<DownloadPreview>({
        state: "authNeeded",
    });
    const inputRef = useRef<HTMLInputElement>(null);
    // 동기화 범위를 숫자로 못 박기 위한 작품 수 (0이면 문구만 표시)
    const projectCount = useEditorStore((s) => s.projects.length);

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
        isRemoteStale,
        remoteModifiedAt,
        upload,
        download,
        fetchRemote,
        keepLocal,
        disconnect,
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

    // 원격 백업을 먼저 읽어 지금 이 기기의 상태와 작품 단위로 비교해 둔다.
    // 여기서 받아 둔 백업을 그대로 download에 넘겨 두 번 내려받지 않는다.
    const openDownloadConfirm = async () => {
        setConfirmKind("download");
        if (!getAccessToken()) {
            setDownloadPreview({ state: "authNeeded" });
            return;
        }
        setDownloadPreview({ state: "loading" });
        try {
            const [remote, local] = await Promise.all([
                fetchRemote(),
                collectLocalData(),
            ]);
            setDownloadPreview({
                state: "ready",
                diffs: diffByProject(local, remote.data),
                remote,
            });
        } catch {
            setDownloadPreview({ state: "error" });
        }
    };

    const handleConfirmUpload = async () => {
        setConfirmKind(null);
        if (!getAccessToken()) {
            savePendingAction("upload");
            await redirectToAuth(clientId ?? "");
            return;
        }
        upload();
    };

    const handleConfirmDownload = async () => {
        const preview = downloadPreview;
        setConfirmKind(null);
        if (!getAccessToken()) {
            savePendingAction("download");
            await redirectToAuth(clientId ?? "");
            return;
        }
        download(preview.state === "ready" ? preview.remote : undefined);
    };

    const handleKeepLocal = async () => {
        setConfirmKind(null);
        if (!getAccessToken()) {
            savePendingAction("upload");
            await redirectToAuth(clientId ?? "");
            return;
        }
        keepLocal();
    };

    if (!clientId || isEditingClientId) {
        return (
            <>
                <div className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            {t("drive_title")}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowGuide(true)}
                                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                title={t("drive_howToGetTitle")}
                            >
                                {t("drive_howToGet")}
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
                                    {t("cancel")}
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="mb-2 text-xs text-zinc-400 dark:text-zinc-500">
                        {t("drive_clientIdHelp")}
                    </p>
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) =>
                            e.key === "Enter" && handleSaveClientId()
                        }
                        placeholder={t("drive_clientIdPlaceholder")}
                        className="mb-1.5 w-full rounded border border-zinc-200 bg-transparent px-2 py-1 text-xs text-zinc-700 placeholder-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:placeholder-zinc-600"
                    />
                    <button
                        type="button"
                        onClick={handleSaveClientId}
                        disabled={!inputValue.trim()}
                        className="w-full rounded bg-zinc-100 px-2 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                        {t("save")}
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
                <div className="mb-1.5 flex items-start justify-between">
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            {t("drive_title")}
                        </span>
                        {/* 백업은 DB 전체 단위다 — 지금 보고 있는 작품만 바뀐다는 오해 방지 */}
                        <span
                            className="text-[10px] text-zinc-400 dark:text-zinc-500"
                            title={t("drive_scopeHint")}
                        >
                            {projectCount > 0
                                ? t("drive_scopeAll", { n: projectCount })
                                : t("drive_scopeAllUnknown")}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        {isConnected && (
                            <button
                                type="button"
                                onClick={disconnect}
                                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            >
                                {t("disconnect")}
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
                            {t("settings")}
                        </button>
                    </div>
                </div>

                <div className="flex gap-1.5">
                    <button
                        type="button"
                        onClick={openUploadConfirm}
                        disabled={isSyncing}
                        className="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        title={t("drive_uploadTitle")}
                    >
                        <Upload className="size-3.5" />
                        {t("upload")}
                    </button>
                    <button
                        type="button"
                        onClick={openDownloadConfirm}
                        disabled={isSyncing}
                        className="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        title={t("drive_downloadTitle")}
                    >
                        <Download className="size-3.5" />
                        {t("download")}
                    </button>
                </div>

                {isRemoteStale && !isSyncing && (
                    <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 dark:border-amber-800 dark:bg-amber-950">
                        <div className="mb-2 flex items-start gap-1.5">
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                            <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                                {remoteModifiedAt
                                    ? t("drive_staleWarningTime", {
                                          time: formatRelativeTime(
                                              remoteModifiedAt,
                                              t,
                                          ),
                                      })
                                    : t("drive_staleWarning")}
                            </p>
                        </div>
                        {/* 받기냐 유지냐는 무엇이 바뀌는지 본 뒤에 고르는 게 맞다.
                            여기서는 미리보기만 열고, 실제 선택은 모달에서 한다. */}
                        <button
                            type="button"
                            onClick={openDownloadConfirm}
                            className="w-full rounded bg-amber-500 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-600"
                        >
                            {t("drive_staleDownload")}
                        </button>
                    </div>
                )}
                {!isConnected && lastSyncedAt && !isSyncing && (
                    <p className="mt-1 text-center text-xs text-amber-500 dark:text-amber-400">
                        {t("drive_paused")}
                    </p>
                )}
                {isConnected &&
                    lastSyncedAt &&
                    !isSyncing &&
                    syncStatus !== "success" && (
                        <p className="mt-1 text-center text-xs text-zinc-400 dark:text-zinc-500">
                            {t("drive_lastSync", {
                                time: formatRelativeTime(lastSyncedAt, t),
                            })}
                        </p>
                    )}
                {isSyncing && (
                    <p className="mt-1 text-center text-xs text-zinc-400">
                        {t("syncing")}
                    </p>
                )}
                {syncStatus === "success" && (
                    <p className="mt-1 text-center text-xs text-emerald-500">
                        {t("drive_complete")}
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
                        aria-label={t("snapshot_closeLabel")}
                    />
                    <div className="relative z-10 w-full max-w-xs rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                        <h2 className="mb-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            {t("drive_uploadModalTitle")}
                        </h2>

                        {!uploadConfirm.checked ? (
                            <p className="mb-4 text-xs text-zinc-400">
                                {t("checking")}
                            </p>
                        ) : uploadConfirm.isEmpty ? (
                            <>
                                <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-950">
                                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-red-500" />
                                    <p className="text-xs leading-relaxed text-red-600 dark:text-red-400">
                                        {t("drive_emptyWarning")}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setConfirmKind(null)}
                                    className="w-full rounded-lg bg-zinc-100 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                >
                                    {t("cancel")}
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="mb-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                    {t("drive_uploadConfirm")}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleConfirmUpload}
                                        className="flex-1 rounded-lg bg-zinc-800 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                                    >
                                        {t("upload")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmKind(null)}
                                        className="flex-1 rounded-lg bg-zinc-100 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                    >
                                        {t("cancel")}
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
                        aria-label={t("snapshot_closeLabel")}
                    />
                    <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                        <h2 className="mb-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            {t("drive_downloadModalTitle")}
                        </h2>
                        <p className="mb-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                            {t("drive_downloadConfirm")}
                        </p>

                        <div className="mb-4 min-h-0 flex-1 overflow-y-auto">
                            <p className="mb-2 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                                {t("drive_previewHeading")}
                            </p>
                            {downloadPreview.state === "loading" && (
                                <p className="py-6 text-center text-xs text-zinc-400">
                                    {t("drive_previewLoading")}
                                </p>
                            )}
                            {downloadPreview.state === "error" && (
                                <p className="py-6 text-center text-xs text-red-500">
                                    {t("drive_previewError")}
                                </p>
                            )}
                            {downloadPreview.state === "authNeeded" && (
                                <p className="py-6 text-center text-xs leading-relaxed text-zinc-400">
                                    {t("drive_previewAuthNeeded")}
                                </p>
                            )}
                            {downloadPreview.state === "ready" && (
                                <DriveDownloadPreview
                                    diffs={downloadPreview.diffs}
                                />
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleConfirmDownload}
                                disabled={downloadPreview.state === "loading"}
                                className="flex-1 rounded-lg bg-zinc-800 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                            >
                                {t("download")}
                            </button>
                            {/* 원격이 더 새로울 때만. 유지를 고르면 지금 이 기기의
                                내용을 올려 원격의 새 버전을 대체한다. */}
                            {isRemoteStale && (
                                <button
                                    type="button"
                                    onClick={handleKeepLocal}
                                    className="flex-1 rounded-lg bg-amber-100 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:hover:bg-amber-800"
                                >
                                    {t("drive_staleKeepLocal")}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setConfirmKind(null)}
                                className="flex-1 rounded-lg bg-zinc-100 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            >
                                {t("cancel")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showGuide && (
                <ClientIdGuideModal onClose={() => setShowGuide(false)} />
            )}
        </>
    );
}
