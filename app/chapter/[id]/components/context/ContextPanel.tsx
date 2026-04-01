"use client";

import { ArrowLeft } from "lucide-react";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { CharacterDetail } from "../detail/CharacterDetail";
import { LoreDetail } from "../detail/LoreDetail";
import { AiChatPanel } from "./AiChatPanel";

export function ContextPanel() {
    const { detailPanel, setDetailPanel, characters, lores } = useEditorStore();

    if (detailPanel?.type === "character") {
        const character = characters.find(
            (c) => c.id === detailPanel.characterId,
        );
        return (
            <div className="flex h-full flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
                    <button
                        type="button"
                        onClick={() => setDetailPanel(null)}
                        className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <ArrowLeft className="h-4 w-4 text-zinc-500" />
                    </button>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        등장인물
                    </span>
                    <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {character?.name ?? "인물 상세"}
                    </h2>
                </div>
                <div className="flex flex-1 flex-col overflow-hidden p-4">
                    <CharacterDetail characterId={detailPanel.characterId} />
                </div>
            </div>
        );
    }

    if (detailPanel?.type === "lore") {
        const lore = lores.find((l) => l.id === detailPanel.loreId);
        return (
            <div className="flex h-full flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
                    <button
                        type="button"
                        onClick={() => setDetailPanel(null)}
                        className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <ArrowLeft className="h-4 w-4 text-zinc-500" />
                    </button>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        설정집
                    </span>
                    <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {lore?.name ?? "설정 상세"}
                    </h2>
                </div>
                <div className="flex flex-1 flex-col overflow-hidden p-4">
                    <LoreDetail loreId={detailPanel.loreId} />
                </div>
            </div>
        );
    }

    return <AiChatPanel />;
}
