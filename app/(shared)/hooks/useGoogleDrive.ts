"use client";

import { useCallback, useEffect, useState } from "react";
import { useEditorStore } from "../stores/editorStore";
import {
    clearAccessToken,
    createAutoSnapshot,
    deleteSnapshot as deleteSnapshotFn,
    exportToDrive,
    exportToDriveWithSnapshot,
    getAccessToken,
    getLastSyncedAt,
    importFromDrive,
    listSnapshots as listSnapshotsFn,
    requestToken,
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

    // 수동 동기화용 — 팝업 띄워서 토큰 획득
    const ensureAuth = useCallback(async (): Promise<void> => {
        if (getAccessToken()) return;
        const token = await requestToken(clientId);
        setAccessToken(token);
        setIsConnected(true);
    }, [clientId]);

    const withSync = useCallback(
        async (action: () => Promise<void>) => {
            setSyncStatus("syncing");
            setErrorMessage(null);
            try {
                await ensureAuth();
                try {
                    await action();
                } catch (e) {
                    const msg = e instanceof Error ? e.message : "";
                    if (msg.includes("401") || msg.includes("인증")) {
                        // 토큰 만료 — 재인증 후 1회 재시도
                        clearAccessToken();
                        setIsConnected(false);
                        await ensureAuth();
                        await action();
                    } else {
                        throw e;
                    }
                }
                setSyncStatus("success");
                const now = new Date();
                saveLastSyncedAt(now);
                setLastSyncedAt(now);
            } catch (e) {
                const msg = e instanceof Error ? e.message : "알 수 없는 오류";
                setErrorMessage(msg);
                setSyncStatus("error");
                if (msg.includes("401") || msg.includes("인증")) {
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

    // 자동 업로드 — 이미 토큰이 있을 때만 실행 (팝업 없이)
    const autoUploadCore = useCallback(async () => {
        if (!getAccessToken()) return; // 미인증 상태면 스킵
        try {
            await createAutoSnapshot();
            await exportToDrive();
            const now = new Date();
            saveLastSyncedAt(now);
            setLastSyncedAt(now);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "";
            if (msg.includes("401") || msg.includes("인증")) {
                clearAccessToken();
                setIsConnected(false);
            }
        }
    }, []);

    const autoUpload = useDebouncedCallback(autoUploadCore, 30_000);

    // editorStore 데이터 변경 감지 → autoUpload 트리거
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
