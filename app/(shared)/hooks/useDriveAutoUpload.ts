"use client";

import { useCallback, useEffect, useRef } from "react";
import { replaceContent } from "../stores/contentReplaceStore";
import { useDriveSyncStore } from "../stores/driveSyncStore";
import { useEditorStore } from "../stores/editorStore";
import {
    clearAccessToken,
    clearUnsyncedChanges,
    createAutoSnapshot,
    DriveAuthError,
    exportToDrive,
    getAccessToken,
    getUnsyncedSince,
    hasLocalChangesSinceSync,
    importFromDrive,
    inspectRemote,
    markUnsyncedChanges,
    saveLastSyncedAt,
    setAccessToken,
    tryRefreshTokenSilently,
} from "../utils/googleDrive";
import { useDebouncedCallback } from "./useDebouncedCallback";

const AUTO_UPLOAD_DELAY_MS = 30_000;
// 탭을 떠날 때 씬 본문 저장(최대 1초 디바운스)이 끝나 다시 걸린 업로드까지 올리기 위한 여유
const LEAVE_UPLOAD_SETTLE_MS = 2_000;
// 창 포커스·탭 전환이 잦아도 Drive 확인은 이 간격에 한 번만
const FOCUS_CHECK_MIN_INTERVAL_MS = 10_000;

// 키를 눌러도 내용이 안 바뀌는 키. 이것만 눌렀으면 "입력 시작"으로 보지 않는다
const NON_EDITING_KEYS = new Set([
    "Shift",
    "Control",
    "Alt",
    "Meta",
    "CapsLock",
    "Tab",
    "Escape",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Home",
    "End",
    "PageUp",
    "PageDown",
]);
const EDITING_EVENTS = [
    "input",
    "paste",
    "cut",
    "drop",
    "compositionstart",
] as const;

// 패널이 데스크톱·모바일 레이아웃에 동시에 붙을 수 있어 인스턴스가 여럿이다.
// 원격 확인·받기·올리기가 겹쳐 두 번 받거나 두 번 올리지 않게 모듈 단위로 줄 세운다.
let syncQueue: Promise<unknown> = Promise.resolve();
let lastFocusCheckAt = 0;

function runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = syncQueue.then(task, task);
    syncQueue = run.catch(() => {});
    return run;
}

// Drive를 확인하는 동안 입력이 시작됐는지 지켜본다
function watchForEditing() {
    let edited = false;
    const markKey = (e: KeyboardEvent) => {
        if (!NON_EDITING_KEYS.has(e.key)) edited = true;
    };
    const markEdit = () => {
        edited = true;
    };
    document.addEventListener("keydown", markKey, true);
    for (const type of EDITING_EVENTS) {
        document.addEventListener(type, markEdit, true);
    }
    return {
        edited: () => edited,
        stop: () => {
            document.removeEventListener("keydown", markKey, true);
            for (const type of EDITING_EVENTS) {
                document.removeEventListener(type, markEdit, true);
            }
        },
    };
}

// 에디터·입력칸은 포커스 중엔 바깥 변경을 반영하지 않는다(SceneEditor, useDraftValue).
// 포커스를 둔 채 받으면 받은 내용이 화면에 안 보이고, 다음 입력이 옛 내용으로 덮어쓴다.
function releaseEditingFocus(): void {
    const active = document.activeElement;
    if (
        active instanceof HTMLElement &&
        (active.isContentEditable ||
            active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA")
    ) {
        active.blur();
    }
}

interface Options {
    /** 다른 기기에서 바뀐 내용을 받아 적용한 뒤 화면 데이터를 다시 불러온다. 없으면 자동으로 받지 않는다 */
    reloadAfterPull?: () => Promise<void>;
    /** 토큰이 만료됐을 때 조용히 다시 받아도 되는지 (직접 연결을 끊었으면 false) */
    canReconnect?: () => boolean;
    onReconnected?: () => void;
    onSynced?: (at: Date) => void;
    onAuthError?: () => void;
}

/**
 * 작품 데이터가 바뀌면 30초 뒤 Drive에 자동으로 올리고, 탭을 떠날 때는 바로 올린다.
 * 탭으로 돌아오면 Drive를 확인해, 다른 기기만 바꿨으면 받아 오고 둘 다 바꿨으면 알린다.
 * 에디터뿐 아니라 대시보드(시놉시스 편집)처럼 Drive UI가 없는 화면에도 붙인다.
 * 화면을 떠나 대기 중인 업로드가 버려져도, 남겨 둔 표시로 다음 화면에서 이어 올린다.
 */
export function useDriveAutoUpload(options: Options = {}) {
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const handleAuthError = useCallback(() => {
        clearAccessToken();
        optionsRef.current.onAuthError?.();
    }, []);

    // 반환값: 이어서 이 기기 내용을 올려도 되는지
    const reconcileRemote = useCallback(async (): Promise<boolean> => {
        const { reloadAfterPull, onSynced } = optionsRef.current;
        const { setRemoteStale, setAutoPulled } = useDriveSyncStore.getState();
        const editing = watchForEditing();
        try {
            const state = await inspectRemote();
            if (state.kind === "nothingNew") return true;
            if (
                state.kind === "diverged" ||
                !reloadAfterPull ||
                editing.edited()
            ) {
                setRemoteStale(state.modifiedTime);
                return false;
            }
            releaseEditingFocus();
            // 포커스를 놓으며 대기 중이던 저장이 끝났을 수 있어 한 번 더 확인
            if (editing.edited() || (await hasLocalChangesSinceSync())) {
                setRemoteStale(state.modifiedTime);
                return false;
            }
            await replaceContent(async () => {
                try {
                    // 이 기기 내용은 이미 Drive에 올라간 상태라 이름 붙은 보존본까지는 필요 없다
                    await importFromDrive(state.remote);
                } catch (e) {
                    // 자동으로 못 받았으면 직접 받을 수 있게 알림으로 넘긴다
                    if (!(e instanceof DriveAuthError)) {
                        setRemoteStale(state.modifiedTime);
                    }
                    throw e;
                }
                clearUnsyncedChanges();
                const now = new Date();
                saveLastSyncedAt(now);
                setAutoPulled(now);
                onSynced?.(now);
                await reloadAfterPull();
            });
            return false;
        } finally {
            editing.stop();
        }
    }, []);

    const ensureAccessToken = useCallback(async (): Promise<boolean> => {
        if (getAccessToken()) return true;
        const { canReconnect, onReconnected } = optionsRef.current;
        if (!canReconnect?.()) return false;
        const result = await tryRefreshTokenSilently();
        if (!result.token) return false;
        setAccessToken(result.token);
        onReconnected?.();
        return true;
    }, []);

    /** 원격 확인만 한다 (받을 게 있으면 받는다). throttle이면 포커스 이벤트용 간격 제한을 건다 */
    const syncNow = useCallback(
        (opts: { throttle?: boolean } = {}) =>
            runExclusive(async () => {
                if (useDriveSyncStore.getState().isRemoteStale) return;
                if (opts.throttle) {
                    if (
                        Date.now() - lastFocusCheckAt <
                        FOCUS_CHECK_MIN_INTERVAL_MS
                    ) {
                        return;
                    }
                    lastFocusCheckAt = Date.now();
                }
                try {
                    // 노트북을 덮어 둔 사이 토큰이 만료돼 있으면 확인이 조용히 건너뛰어지므로 먼저 갱신
                    if (!(await ensureAccessToken())) return;
                    await reconcileRemote();
                } catch (e) {
                    if (e instanceof DriveAuthError) handleAuthError();
                    // 그 밖의 확인 실패가 작업을 막아서는 안 됨
                }
            }),
        [ensureAccessToken, reconcileRemote, handleAuthError],
    );

    const autoUploadCore = useCallback(
        () =>
            runExclusive(async () => {
                if (!getAccessToken()) return;
                // 둘 다 바뀐 상태가 해소되지 않았으면 자동 업로드를 막아 덮어쓰기 방지
                if (useDriveSyncStore.getState().isRemoteStale) return;
                const since = getUnsyncedSince();
                try {
                    // 스테일 여부를 아는 UI가 없는 화면도 있으므로 올리기 직전에 직접 확인
                    if (!(await reconcileRemote())) return;
                    // 작품을 열기만 해도 스토어가 바뀌어 여기까지 온다. 내용이 그대로면 올리지 않는다
                    // (안 그러면 다른 기기가 "새 버전이 올라왔다"고 오인한다)
                    if (!(await hasLocalChangesSinceSync())) {
                        clearUnsyncedChanges(since);
                        return;
                    }
                    await createAutoSnapshot();
                    await exportToDrive();
                    clearUnsyncedChanges(since);
                    const now = new Date();
                    saveLastSyncedAt(now);
                    optionsRef.current.onSynced?.(now);
                } catch (e) {
                    if (e instanceof DriveAuthError) handleAuthError();
                }
            }),
        [reconcileRemote, handleAuthError],
    );

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

    useEffect(() => {
        let settleTimer: ReturnType<typeof setTimeout> | null = null;
        const handleVisibility = () => {
            if (settleTimer) clearTimeout(settleTimer);
            if (document.visibilityState === "hidden") {
                // 다른 기기로 넘어가기 전에 올려 둔다 (30초를 기다리면 그 사이 다른 기기에서 쓰게 된다)
                autoUpload.flush();
                settleTimer = setTimeout(() => {
                    if (document.visibilityState === "hidden") {
                        autoUpload.flush();
                    }
                }, LEAVE_UPLOAD_SETTLE_MS);
            } else {
                syncNow({ throttle: true });
            }
        };
        const handleFocus = () => syncNow({ throttle: true });
        document.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("focus", handleFocus);
        return () => {
            if (settleTimer) clearTimeout(settleTimer);
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("focus", handleFocus);
        };
    }, [autoUpload, syncNow]);

    return { syncNow };
}
