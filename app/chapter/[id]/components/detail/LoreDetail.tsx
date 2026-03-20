"use client";

import { BookOpen } from "lucide-react";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";

export function LoreDetail({ loreId }: { loreId: number }) {
    const { lores } = useEditorStore();
    const lore = lores.find((l) => l.id === loreId);

    if (!lore) {
        return (
            <p className="p-4 text-sm text-zinc-500">
                설정을 찾을 수 없습니다.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-zinc-500" />
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {lore.name}
                </h3>
            </div>
            <span className="inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {lore.category}
            </span>
            {lore.description ? (
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {lore.description}
                </p>
            ) : (
                <p className="text-sm text-zinc-400">설명이 없습니다.</p>
            )}
        </div>
    );
}
