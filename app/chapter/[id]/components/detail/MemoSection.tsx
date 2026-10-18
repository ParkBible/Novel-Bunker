"use client";

import { useLayoutEffect, useRef } from "react";
import { useDraftValue } from "@/app/(shared)/hooks/useDraftValue";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";

export function MemoSection({
    value,
    onSave,
}: {
    value: string;
    onSave: (memo: string) => Promise<void>;
}) {
    const t = useTranslation();
    const { draft, handleChange, handleFocus, handleBlur } = useDraftValue(
        value,
        onSave,
        500,
    );
    const ref = useRef<HTMLTextAreaElement>(null);

    // biome-ignore lint/correctness/useExhaustiveDependencies: draft 변경 시 textarea 높이 재조정 트리거
    useLayoutEffect(() => {
        if (ref.current && !CSS.supports("field-sizing", "content")) {
            ref.current.style.height = "auto";
            ref.current.style.height = `${ref.current.scrollHeight}px`;
        }
    }, [draft]);

    return (
        <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("memo_title")}
            </h3>
            <textarea
                ref={ref}
                value={draft}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={t("memo_placeholder")}
                rows={4}
                className="field-sizing-content min-h-24 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm leading-relaxed text-zinc-700 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:focus:border-zinc-500"
            />
        </div>
    );
}
