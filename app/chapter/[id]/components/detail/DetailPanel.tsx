"use client";

import { X } from "lucide-react";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { ChapterDetail } from "./ChapterDetail";
import { CharacterDetail } from "./CharacterDetail";
import { LoreDetail } from "./LoreDetail";
import { SceneDetail } from "./SceneDetail";

type PanelTitle = string | { prefix: string; title: string };

function usePanelTitle(): PanelTitle {
    const { detailPanel, scenes, chapters, characters, lores } =
        useEditorStore();

    if (!detailPanel) return "";

    switch (detailPanel.type) {
        case "scene": {
            const scene = scenes.find((s) => s.id === detailPanel.sceneId);
            if (!scene) return "씬 상세";
            const sceneIndex =
                scenes
                    .filter((s) => s.chapterId === scene.chapterId)
                    .sort((a, b) => a.order - b.order)
                    .findIndex((s) => s.id === scene.id) + 1;
            return { prefix: `#${sceneIndex}`, title: scene.title };
        }
        case "chapter":
            return (
                chapters.find((c) => c.id === detailPanel.chapterId)?.title ||
                "챕터 상세"
            );
        case "character":
            return (
                characters.find((c) => c.id === detailPanel.characterId)
                    ?.name || "인물 상세"
            );
        case "lore":
            return (
                lores.find((l) => l.id === detailPanel.loreId)?.name ||
                "설정 상세"
            );
    }
}

export function DetailPanel() {
    const { detailPanel, setDetailPanel } = useEditorStore();
    const panelTitle: PanelTitle = usePanelTitle();

    if (!detailPanel) return null;

    return (
        <div className="flex h-full w-80 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {detailPanel.type === "scene" && "씬"}
                        {detailPanel.type === "chapter" && "챕터"}
                        {detailPanel.type === "character" && "등장인물"}
                        {detailPanel.type === "lore" && "설정집"}
                    </span>
                    <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {typeof panelTitle === "string" ? (
                            panelTitle
                        ) : (
                            <>
                                <span className="text-zinc-400 dark:text-zinc-500">
                                    {panelTitle.prefix}
                                </span>{" "}
                                {panelTitle.title}
                            </>
                        )}
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={() => setDetailPanel(null)}
                    className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                    <X className="h-4 w-4 text-zinc-500" />
                </button>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden p-4">
                {detailPanel.type === "scene" && (
                    <SceneDetail sceneId={detailPanel.sceneId} />
                )}
                {detailPanel.type === "chapter" && (
                    <ChapterDetail chapterId={detailPanel.chapterId} />
                )}
                {detailPanel.type === "character" && (
                    <CharacterDetail characterId={detailPanel.characterId} />
                )}
                {detailPanel.type === "lore" && (
                    <LoreDetail loreId={detailPanel.loreId} />
                )}
            </div>
        </div>
    );
}
