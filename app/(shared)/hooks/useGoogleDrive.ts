"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "../stores/editorStore";
import {
    clearAccessToken,
    clearPendingAction,
    createAutoSnapshot,
    DriveAuthError,
    deleteSnapshot as deleteSnapshotFn,
    exportToDrive,
    exportToDriveWithSnapshot,
    getAccessToken,
    getLastSyncedAt,
    getPendingAction,
    importFromDrive,
    listSnapshots as listSnapshotsFn,
    restoreSnapshot as restoreSnapshotFn,
    type SnapshotInfo,
    saveLastSyncedAt,
    setAccessToken,
} from "../utils/googleDrive";
import { useDebouncedCallback } from "./useDebouncedCallback";

type SyncStatus = "idle" | "syncing" | "success" | "error";

export function useGoogleDrive(clientId: string) {
    const [isConnected, setIsConnected] = useState(false);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
    const { loadData } = useEditorStore();

    useEffect(() => {
        setIsConnected(!!getAccessToken());
        setLastSyncedAt(getLastSyncedAt());
    }, []);

    // redirect 인증 완료 후 토큰이 sessionStorage에 있으면 연결 상태 갱신
    const ensureAuth = useCallback(async (): Promise<void> => {
        if (!getAccessToken()) {
            throw new DriveAuthError("인증이 필요합니다. 다시 시도해 주세요.");
        }
    }, []);

    const withSync = useCallback(
        async (action: () => Promise<void>) => {
            setSyncStatus("syncing");
            setErrorMessage(null);
            try {
                await ensureAuth();
                try {
                    await action();
                } catch (e) {
                    if (e instanceof DriveAuthError) {
                        clearAccessToken();
                        setIsConnected(false);
                    }
                    throw e;
                }
                setSyncStatus("success");
                const now = new Date();
                saveLastSyncedAt(now);
                setLastSyncedAt(now);
            } catch (e) {
                const msg = e instanceof Error ? e.message : "알 수 없는 오류";
                setErrorMessage(msg);
                setSyncStatus("error");
                if (e instanceof DriveAuthError) {
                    clearAccessToken();
                    setIsConnected(false);
                }
            }
        },
        [ensureAuth],
    );

    const upload = useCallback(
        () => withSync(() => exportToDriveWithSnapshot()),
        [withSync],
    );

    const download = useCallback(
        () =>
            withSync(async () => {
                await importFromDrive();
                await loadData();
            }),
        [withSync, loadData],
    );

    // redirect 복귀 후 pending action 실행 — stale closure 방지를 위해 ref 사용
    const uploadRef = useRef(upload);
    const downloadRef = useRef(download);
    uploadRef.current = upload;
    downloadRef.current = download;

    useEffect(() => {
        if (!getAccessToken()) return;
        const pending = getPendingAction();
        if (!pending) return;
        clearPendingAction();
        setIsConnected(true);
        if (pending === "upload") uploadRef.current();
        else if (pending === "download") downloadRef.current();
    }, []); // mount 시 1회만 실행

    const disconnect = useCallback(() => {
        clearAccessToken();
        setIsConnected(false);
        setSyncStatus("idle");
        setErrorMessage(null);
    }, []);

    const loadSnapshots = useCallback(async (): Promise<SnapshotInfo[]> => {
        await ensureAuth();
        return listSnapshotsFn();
    }, [ensureAuth]);

    const restoreSnapshot = useCallback(
        (fileId: string) =>
            withSync(async () => {
                await restoreSnapshotFn(fileId);
                await loadData();
            }),
        [withSync, loadData],
    );

    const deleteSnapshot = useCallback(
        async (fileId: string): Promise<void> => {
            await ensureAuth();
            await deleteSnapshotFn(fileId);
        },
        [ensureAuth],
    );

    // 자동 업로드 — 토큰이 있을 때만 실행
    const autoUploadCore = useCallback(async () => {
        if (!getAccessToken()) return;
        try {
            await createAutoSnapshot();
            await exportToDrive();
            const now = new Date();
            saveLastSyncedAt(now);
            setLastSyncedAt(now);
        } catch (e) {
            if (e instanceof DriveAuthError) {
                clearAccessToken();
                setIsConnected(false);
            }
        }
    }, []);

    const autoUpload = useDebouncedCallback(autoUploadCore, 30_000);

    useEffect(() => {
        const unsubscribe = useEditorStore.subscribe((state, prevState) => {
            const changed =
                state.chapters !== prevState.chapters ||
                state.scenes !== prevState.scenes ||
                state.characters !== prevState.characters ||
                state.relationships !== prevState.relationships ||
                state.lores !== prevState.lores ||
                state.novelTitle !== prevState.novelTitle ||
                state.synopsis !== prevState.synopsis ||
                state.loreCategories !== prevState.loreCategories ||
                state.characterGroups !== prevState.characterGroups;
            if (changed) autoUpload();
        });
        return unsubscribe;
    }, [autoUpload]);

    return {
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
    };
}
