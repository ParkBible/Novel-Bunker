"use client";

import { useCallback, useEffect, useState } from "react";
import { useEditorStore } from "../stores/editorStore";
import {
    clearAccessToken,
    exportToDrive,
    getAccessToken,
    getLastSyncedAt,
    importFromDrive,
    requestToken,
    saveLastSyncedAt,
    setAccessToken,
} from "../utils/googleDrive";
import { useDebouncedCallback } from "./useDebouncedCallback";

type SyncStatus = "idle" | "syncing" | "success" | "error";

export function useGoogleDrive(clientId: string) {
    const [isConnected, setIsConnected] = useState(false);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() =>
        getLastSyncedAt(),
    );
    const { loadData } = useEditorStore();

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
                await action();
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
        () => withSync(() => exportToDrive()),
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

    // 자동 업로드 — 이미 토큰이 있을 때만 실행 (팝업 없이)
    const autoUploadCore = useCallback(async () => {
        if (!getAccessToken()) return; // 미인증 상태면 스킵
        try {
            await exportToDrive();
            const now = new Date();
            saveLastSyncedAt(now);
            setLastSyncedAt(now);
        } catch {
            // silent 실패 → 무시
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
                state.lores !== prevState.lores;
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
    };
}
