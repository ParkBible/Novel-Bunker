"use client";

import { BookOpen } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Lore } from "@/app/(shared)/db";
import { useDraftValue } from "@/app/(shared)/hooks/useDraftValue";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";

const inlineInputClass =
    "w-full bg-transparent text-sm text-zinc-700 outline-none placeholder:text-zinc-300 hover:bg-zinc-50 focus:bg-zinc-50 rounded px-1 py-0.5 -mx-1 transition-colors dark:text-zinc-300 dark:placeholder:text-zinc-600 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800";

const inlineTextareaClass =
    "w-full resize-none overflow-hidden bg-transparent text-sm leading-relaxed text-zinc-700 outline-none placeholder:text-zinc-300 hover:bg-zinc-50 focus:bg-zinc-50 rounded px-1 py-0.5 -mx-1 transition-colors dark:text-zinc-300 dark:placeholder:text-zinc-600 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800";

function InlineInput({
    value,
    placeholder,
    onChange,
}: {
    value: string;
    placeholder: string;
    onChange: (val: string) => void;
}) {
    const { draft, handleChange, handleFocus, handleBlur } = useDraftValue(
        value,
        onChange,
    );
    return (
        <input
            value={draft}
            placeholder={placeholder}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={inlineInputClass}
        />
    );
}

function AutoResizeTextarea({
    value,
    placeholder,
    onChange,
}: {
    value: string;
    placeholder: string;
    onChange: (val: string) => void;
}) {
    const {
        draft,
        handleChange: saveDraft,
        handleFocus,
        handleBlur,
    } = useDraftValue(value, onChange);
    const ref = useRef<HTMLTextAreaElement>(null);

    // biome-ignore lint/correctness/useExhaustiveDependencies: draft를 의존성으로 등록하여 값 변경 시 높이 재계산 트리거
    useEffect(() => {
        if (ref.current) {
            ref.current.style.height = "auto";
            ref.current.style.height = `${ref.current.scrollHeight}px`;
        }
    }, [draft]);

    return (
        <textarea
            ref={ref}
            value={draft}
            rows={4}
            placeholder={placeholder}
            onChange={(e) => saveDraft(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={inlineTextareaClass}
        />
    );
}

export function LoreDetail({ loreId }: { loreId: number }) {
    const t = useTranslation();
    const { lores, loreCategories, updateLore } = useEditorStore();
    const lore = lores.find((l) => l.id === loreId);

    if (!lore) {
        return (
            <p className="p-4 text-sm text-zinc-500">
                {t("loreDetail_notFound")}
            </p>
        );
    }

    const save = (updates: Partial<Lore>) => {
        if (!lore.id) return;
        updateLore(lore.id, updates);
    };

    return (
        <div className="space-y-4 overflow-x-hidden">
            {/* 이름 */}
            <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 shrink-0 text-zinc-400" />
                <InlineInput
                    value={lore.name}
                    placeholder={t("loreDetail_namePlaceholder")}
                    onChange={(name) => save({ name })}
                />
            </div>

            {/* 카테고리 */}
            <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs text-zinc-400">
                    {t("loreDetail_category")}
                </span>
                <select
                    value={lore.category}
                    onChange={(e) => save({ category: e.target.value })}
                    className="w-full rounded bg-transparent px-1 py-0.5 text-sm text-zinc-700 outline-none hover:bg-zinc-50 focus:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800"
                >
                    {loreCategories.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>
            </div>

            {/* 설명 */}
            <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-400">
                    {t("loreDetail_description")}
                </span>
                <AutoResizeTextarea
                    value={lore.description}
                    placeholder={t("loreDetail_descriptionPlaceholder")}
                    onChange={(description) => save({ description })}
                />
            </div>
        </div>
    );
}
