import { useEffect, useState } from "react";
import { useDebouncedCallback } from "./useDebouncedCallback";

export function useDraftValue(
    value: string,
    onChange: (val: string) => void | Promise<void>,
    delay = 300,
) {
    const [draft, setDraft] = useState(value);
    const debouncedSave = useDebouncedCallback(onChange, delay);

    useEffect(() => {
        setDraft(value);
    }, [value]);

    const handleChange = (val: string) => {
        setDraft(val);
        debouncedSave(val);
    };

    return { draft, handleChange };
}
