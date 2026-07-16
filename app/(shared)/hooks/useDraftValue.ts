import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "./useDebouncedCallback";

export function useDraftValue(
    value: string,
    onChange: (val: string) => void | Promise<void>,
    delay = 300,
) {
    const [draft, setDraft] = useState(value);
    const isFocusedRef = useRef(false);
    const debouncedSave = useDebouncedCallback(onChange, delay);

    useEffect(() => {
        if (!isFocusedRef.current) {
            setDraft(value);
        }
    }, [value]);

    // 탭 숨김/페이지 이탈 시 대기 중이던 저장을 즉시 커밋 → 마지막 입력 유실 방지
    useEffect(() => {
        const flush = () => debouncedSave.flush();
        const handleVisibility = () => {
            if (document.visibilityState === "hidden") flush();
        };
        window.addEventListener("beforeunload", flush);
        window.addEventListener("pagehide", flush);
        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
            window.removeEventListener("beforeunload", flush);
            window.removeEventListener("pagehide", flush);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [debouncedSave]);

    const handleChange = (val: string) => {
        setDraft(val);
        debouncedSave(val);
    };

    const handleFocus = () => {
        isFocusedRef.current = true;
    };

    const handleBlur = () => {
        isFocusedRef.current = false;
        // 포커스를 잃으면 대기 중이던 저장을 즉시 커밋
        debouncedSave.flush();
    };

    return { draft, handleChange, handleFocus, handleBlur };
}
