"use client";

import { useEffect, useRef } from "react";
import { snapshotOps } from "../db/snapshots";
import { useEditorStore } from "../stores/editorStore";
import { useDebouncedCallback } from "./useDebouncedCallback";

// 편집이 멈춘 뒤 이 시간이 지나면 자동 스냅샷 (idle 캡처)
const IDLE_DELAY_MS = 60_000; // 60초
// 연속 편집 중에도 최소 이 간격마다 스냅샷 (활동 중 캡처)
const MAX_INTERVAL_MS = 5 * 60_000; // 5분

/**
 * editorStore 변경을 감지해 로컬 버전 스냅샷을 자동으로 남긴다.
 * 앱 편집 화면에서 1회 마운트해 사용.
 */
export function useLocalSnapshots() {
    const lastSnapshotAtRef = useRef(0);

    const takeSnapshot = useRef(async () => {
        lastSnapshotAtRef.current = Date.now();
        try {
            await snapshotOps.createAutoIfChanged();
        } catch {
            // 스냅샷 실패가 편집을 막아서는 안 됨
        }
    }).current;

    // 편집이 멈추면(idle) 스냅샷 — 안정된 버전을 남김
    const scheduleIdleSnapshot = useDebouncedCallback(
        takeSnapshot,
        IDLE_DELAY_MS,
    );

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
            if (!changed) return;

            // 장시간 연속 편집 중에도 최소 주기로 캡처 (leading)
            if (Date.now() - lastSnapshotAtRef.current >= MAX_INTERVAL_MS) {
                takeSnapshot();
            }
            // 편집이 멈춘 뒤 idle 캡처 (trailing)
            scheduleIdleSnapshot();
        });
        return unsubscribe;
    }, [scheduleIdleSnapshot, takeSnapshot]);
}
