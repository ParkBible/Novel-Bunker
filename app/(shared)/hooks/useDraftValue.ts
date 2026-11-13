import { useEffect, useRef, useState } from "react";
import { useContentReplaceStore } from "../stores/contentReplaceStore";
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

    // Drive 받기·복원으로 데이터가 통째로 바뀌면 입력 중이어도 새 내용으로 맞춘다.
    // syncKey는 입력 중에도 내용을 갈아야 하는 편집기(SceneEditor)에 알리는 용도
    const revision = useContentReplaceStore((s) => s.revision);
    const seenRevisionRef = useRef(revision);
    const [syncKey, setSyncKey] = useState(0);
    useEffect(() => {
        if (seenRevisionRef.current === revision) return;
        seenRevisionRef.current = revision;
        // 옛 내용 위에서 잡힌 저장이 새 내용을 덮어쓰지 않도록 버린다
        debouncedSave.cancel();
        setDraft(value);
        setSyncKey((key) => key + 1);
    }, [revision, value, debouncedSave]);

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

    return { draft, syncKey, handleChange, handleFocus, handleBlur };
}
