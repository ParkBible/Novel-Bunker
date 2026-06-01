"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "../stores/editorStore";
import {
    clearAccessToken,
    clearConnectedFlag,
    clearPendingAction,
    createAutoSnapshot,
    DriveAuthError,
    deleteSnapshot as deleteSnapshotFn,
    exportToDrive,
    exportToDriveWithSnapshot,
    getAccessToken,
    getLastSyncedAt,
    getPendingAction,
    getTokenRefreshDelayMs,
    importFromDrive,
    listenForAuthToken,
    listSnapshots as listSnapshotsFn,
    restoreSnapshot as restoreSnapshotFn,
    type SnapshotInfo,
    saveLastSyncedAt,
    setAccessToken,
    tryRefreshTokenSilently,
    wasConnectedBefore,
    whenGisReady,
} from "../utils/googleDrive";
import { useDebouncedCallback } from "./useDebouncedCallback";

type SyncStatus = "idle" | "syncing" | "success" | "error";

export function useGoogleDrive(clientId?: string) {
    const [isConnected, setIsConnected] = useState(false);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
    const { loadData } = useEditorStore();

    // 토큰 자동 갱신 타이머
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clientIdRef = useRef(clientId);
    clientIdRef.current = clientId;

    const scheduleTokenRefresh = useCallback(() => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        // 토큰이 없으면 스케줄링 불필요
        if (!getAccessToken()) return;
        // delay=0이면 즉시 갱신 (50분 창을 이미 지난 경우)
        const delay = getTokenRefreshDelayMs();

        refreshTimerRef.current = setTimeout(async () => {
            if (!clientIdRef.current) return;
            const newToken = await tryRefreshTokenSilently(clientIdRef.current);
            if (newToken) {
                setAccessToken(newToken);
                setIsConnected(true);
                scheduleTokenRefresh(); // 다음 갱신 재예약
            }
            // 실패 시: 토큰 만료 후 자연스럽게 연결 끊김 처리됨
        }, delay);
    }, []); // refs만 사용하므로 deps 없음

    useEffect(() => {
        return () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        };
    }, []);

    useEffect(() => {
        const connected = !!getAccessToken();
        setIsConnected(connected);
        setLastSyncedAt(getLastSyncedAt());
        if (connected) scheduleTokenRefresh();
    }, [scheduleTokenRefresh]);

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
        scheduleTokenRefresh(); // redirect 복귀 후 자동 갱신 시작
        if (pending === "upload") uploadRef.current();
        else if (pending === "download") downloadRef.current();
    }, [scheduleTokenRefresh]); // mount 시 1회만 실행

    // 자동 로그인: clientId가 준비되고 이전에 연결한 적 있으면
    // 앱 시작 시 무음 토큰 갱신을 시도해 UI 없이 재연결한다.
    useEffect(() => {
        if (!clientId) return;
        if (getAccessToken()) return; // 이미 토큰 있음
        if (!wasConnectedBefore()) return; // 한 번도 연결한 적 없으면 시도 안 함

        let cancelled = false;
        (async () => {
            const ready = await whenGisReady();
            if (cancelled || !ready) return;
            if (getAccessToken()) return; // 대기 중 다른 경로로 연결됨
            const token = await tryRefreshTokenSilently(clientId);
            if (cancelled || !token) return; // 무음 갱신 실패 → 수동 로그인 필요
            setAccessToken(token);
            setIsConnected(true);
            scheduleTokenRefresh();
            // 보류 중인 동작이 있으면 이어서 실행
            const pending = getPendingAction();
            if (!pending) return;
            clearPendingAction();
            if (pending === "upload") uploadRef.current();
            else if (pending === "download") downloadRef.current();
        })();
        return () => {
            cancelled = true;
        };
    }, [clientId, scheduleTokenRefresh]);

    // 팝업 인증 완료 시 BroadcastChannel로 토큰 수신
    useEffect(() => {
        return listenForAuthToken((token) => {
            setAccessToken(token);
            setIsConnected(true);
            scheduleTokenRefresh(); // 인증 완료 후 자동 갱신 시작
            const pending = getPendingAction();
            if (!pending) return;
            clearPendingAction();
            if (pending === "upload") uploadRef.current();
            else if (pending === "download") downloadRef.current();
        });
    }, [scheduleTokenRefresh]);

    const disconnect = useCallback(() => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        clearAccessToken();
        clearConnectedFlag(); // 명시적 연결 해제 시 자동 재연결 비활성화
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
