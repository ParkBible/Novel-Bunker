"use client";

import { useCallback, useState } from "react";
import { useEditorStore } from "../stores/editorStore";
import {
    clearAccessToken,
    exportToDrive,
    getAccessToken,
    importFromDrive,
    requestToken,
    setAccessToken,
} from "../utils/googleDrive";

type SyncStatus = "idle" | "syncing" | "success" | "error";

export function useGoogleDrive(clientId: string) {
    const [isConnected, setIsConnected] = useState(false);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { loadData } = useEditorStore();

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
            } catch (e) {
                const msg = e instanceof Error ? e.message : "알 수 없는 오류";
                setErrorMessage(msg);
                setSyncStatus("error");
                // 인증 오류면 연결 해제
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

    return {
        isConnected,
        syncStatus,
        errorMessage,
        upload,
        download,
        disconnect,
    };
}
