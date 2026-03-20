"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function MemoSection({
    value,
    onSave,
}: {
    value: string;
    onSave: (memo: string) => Promise<void>;
}) {
    const [draft, setDraft] = useState(value);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setDraft(value);
    }, [value]);

    const save = useCallback(
        (text: string) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                onSave(text);
            }, 500);
        },
        [onSave],
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setDraft(text);
        save(text);
    };

    return (
        <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                메모
            </h3>
            <textarea
                value={draft}
                onChange={handleChange}
                placeholder="메모를 입력하세요..."
                rows={4}
                className="w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm leading-relaxed text-zinc-700 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:focus:border-zinc-500"
            />
        </div>
    );
}
