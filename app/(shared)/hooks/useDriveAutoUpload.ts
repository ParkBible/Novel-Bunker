"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditorStore } from "../stores/editorStore";
import {
    checkRemoteNewer,
    clearAccessToken,
    clearUnsyncedChanges,
    createAutoSnapshot,
    DriveAuthError,
    exportToDrive,
    getAccessToken,
    getUnsyncedSince,
    markUnsyncedChanges,
    saveLastSyncedAt,
} from "../utils/googleDrive";
import { useDebouncedCallback } from "./useDebouncedCallback";

const AUTO_UPLOAD_DELAY_MS = 30_000;

interface Options {
    /** true면 업로드하지 않는다 (원격 최신본이 아직 해소되지 않은 경우) */
    isBlocked?: () => boolean;
    /** 올리기 직전 확인해 보니 다른 기기의 최신본이 있을 때 */
    onRemoteStale?: (modifiedTime: Date | null) => void;
    onUploaded?: (at: Date) => void;
    onAuthError?: () => void;
}

/**
 * 작품 데이터가 바뀌면 30초 뒤 Drive에 자동으로 올린다.
 * 에디터뿐 아니라 대시보드(시놉시스 편집)처럼 Drive UI가 없는 화면에도 붙인다.
 * 화면을 떠나 대기 중인 업로드가 버려져도, 남겨 둔 표시로 다음 화면에서 이어 올린다.
 */
export function useDriveAutoUpload(options: Options = {}) {
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const autoUploadCore = useCallback(async () => {
        if (!getAccessToken()) return;
        const { isBlocked, onRemoteStale, onUploaded, onAuthError } =
            optionsRef.current;
        // 다른 기기의 최신본이 해소되지 않았으면 자동 업로드를 막아 덮어쓰기 방지
        if (isBlocked?.()) return;
        const since = getUnsyncedSince();
        try {
            // 스테일 여부를 아는 UI가 없는 화면도 있으므로 올리기 직전에 직접 확인
            const { stale, modifiedTime } = await checkRemoteNewer();
            if (stale) {
                onRemoteStale?.(modifiedTime);
                return;
            }
            await createAutoSnapshot();
            await exportToDrive();
            clearUnsyncedChanges(since);
            const now = new Date();
            saveLastSyncedAt(now);
            onUploaded?.(now);
        } catch (e) {
            if (e instanceof DriveAuthError) {
                clearAccessToken();
                onAuthError?.();
            }
        }
    }, []);

    // 언마운트 시 자동 업로드 flush는 하지 않음 (teardown 중 예기치 않은 업로드 방지)
    // 버려진 업로드는 남겨 둔 표시로 다음 마운트 때 다시 잡힌다
    const autoUpload = useDebouncedCallback(
        autoUploadCore,
        AUTO_UPLOAD_DELAY_MS,
        { flushOnUnmount: false },
    );

    useEffect(() => {
        // 이전 화면/세션에서 못 올린 변경이 남아 있으면 이어서 올린다
        if (getUnsyncedSince()) autoUpload();
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
            if (!changed) return;
            markUnsyncedChanges();
            autoUpload();
        });
        return unsubscribe;
    }, [autoUpload]);
}
