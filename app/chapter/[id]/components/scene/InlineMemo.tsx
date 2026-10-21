"use client";

import { ChevronRight, StickyNote } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDraftValue } from "@/app/(shared)/hooks/useDraftValue";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";

const COLLAPSED_KEY_PREFIX = "novelbunker:memoCollapsed:";

function readCollapsed(storageKey: string): boolean | null {
    try {
        const raw = localStorage.getItem(COLLAPSED_KEY_PREFIX + storageKey);
        return raw === null ? null : raw === "1";
    } catch {
        return null;
    }
}

function writeCollapsed(storageKey: string, collapsed: boolean) {
    try {
        localStorage.setItem(
            COLLAPSED_KEY_PREFIX + storageKey,
            collapsed ? "1" : "0",
        );
    } catch {
        // 저장 실패해도 접기 자체는 동작하면 된다
    }
}

/**
 * 챕터/씬 상단에 항상 붙어 있는 메모. 버튼을 눌러 상세 패널을 열지 않아도 바로 보이도록.
 * 기본은 펼침이고, 접힘 상태는 항목별로 기억한다.
 */
export function InlineMemo({
    value,
    onSave,
    storageKey,
    label,
    autoFocus = false,
    onBlur,
}: {
    value: string;
    onSave: (memo: string) => Promise<void>;
    storageKey: string;
    label: string;
    autoFocus?: boolean;
    /** 포커스를 잃을 때 현재 입력값과 함께 호출 (빈 메모를 닫는 용도) */
    onBlur?: (draft: string) => void;
}) {
    const t = useTranslation();
    const [collapsed, setCollapsed] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { draft, handleChange, handleFocus, handleBlur } = useDraftValue(
        value,
        onSave,
        500,
    );

    // localStorage는 SSR에서 못 읽으므로 마운트 후 반영 (hydration 불일치 방지)
    useEffect(() => {
        const stored = readCollapsed(storageKey);
        if (stored !== null) setCollapsed(stored);
    }, [storageKey]);

    // "메모 추가"로 막 연 경우 접혀 있던 기록이 있어도 펼치고 바로 입력하게
    useEffect(() => {
        if (!autoFocus) return;
        setCollapsed(false);
        writeCollapsed(storageKey, false);
        requestAnimationFrame(() => textareaRef.current?.focus());
    }, [autoFocus, storageKey]);

    const toggle = () => {
        const next = !collapsed;
        setCollapsed(next);
        writeCollapsed(storageKey, next);
    };

    const preview = draft.trim().split("\n")[0];

    return (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    toggle();
                }}
                aria-expanded={!collapsed}
                title={collapsed ? t("memo_expand") : t("memo_collapse")}
                className="flex w-full min-w-0 items-center gap-1.5 px-2.5 py-1.5 text-left text-xs"
            >
                <ChevronRight
                    className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform ${
                        collapsed ? "" : "rotate-90"
                    }`}
                />
                <StickyNote className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <span className="shrink-0 font-medium text-zinc-500 dark:text-zinc-400">
                    {label}
                </span>
                {collapsed && preview && (
                    <span className="min-w-0 truncate text-zinc-400 dark:text-zinc-500">
                        {preview}
                    </span>
                )}
            </button>
            {!collapsed && (
                <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => handleChange(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={() => {
                        handleBlur();
                        onBlur?.(draft);
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder={t("memo_placeholder")}
                    rows={Math.min(Math.max(draft.split("\n").length, 2), 8)}
                    className="block w-full resize-y border-t border-zinc-200 bg-transparent px-3 py-2 text-sm leading-relaxed text-zinc-700 outline-none dark:border-zinc-800 dark:text-zinc-300"
                />
            )}
        </div>
    );
}
