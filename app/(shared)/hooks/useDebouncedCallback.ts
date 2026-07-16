import { useCallback, useEffect, useRef } from "react";

export interface DebouncedCallback<T extends unknown[]> {
    (...args: T): void;
    /** 대기 중인 호출을 즉시 실행 (없으면 아무 동작 안 함) */
    flush: () => void;
    /** 대기 중인 호출을 취소 */
    cancel: () => void;
}

interface Options {
    /** 언마운트 시 대기 중이던 호출을 flush할지 (기본 true — 마지막 저장 유실 방지) */
    flushOnUnmount?: boolean;
}

export function useDebouncedCallback<T extends unknown[]>(
    callback: (...args: T) => void,
    delay: number,
    options: Options = {},
): DebouncedCallback<T> {
    const { flushOnUnmount = true } = options;
    const callbackRef = useRef(callback);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastArgsRef = useRef<T | null>(null);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const cancel = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        lastArgsRef.current = null;
    }, []);

    const flush = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (lastArgsRef.current !== null) {
            const args = lastArgsRef.current;
            lastArgsRef.current = null;
            callbackRef.current(...args);
        }
    }, []);

    // 언마운트 시 대기 중이던 호출을 버리지 않고 flush → 마지막 입력 유실 방지
    const flushOnUnmountRef = useRef(flushOnUnmount);
    flushOnUnmountRef.current = flushOnUnmount;
    useEffect(() => {
        return () => {
            if (flushOnUnmountRef.current) flush();
            else cancel();
        };
    }, [flush, cancel]);

    const debounced = useCallback(
        (...args: T) => {
            lastArgsRef.current = args;
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                timerRef.current = null;
                const pending = lastArgsRef.current;
                lastArgsRef.current = null;
                if (pending !== null) callbackRef.current(...pending);
            }, delay);
        },
        [delay],
    ) as DebouncedCallback<T>;

    debounced.flush = flush;
    debounced.cancel = cancel;
    return debounced;
}
