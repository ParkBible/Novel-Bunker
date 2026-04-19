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

    const handleChange = (val: string) => {
        setDraft(val);
        debouncedSave(val);
    };

    const handleFocus = () => {
        isFocusedRef.current = true;
    };

    const handleBlur = () => {
        isFocusedRef.current = false;
    };

    return { draft, handleChange, handleFocus, handleBlur };
}
