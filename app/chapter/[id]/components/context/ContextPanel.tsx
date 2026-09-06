"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { ChapterDetail } from "../detail/ChapterDetail";
import { CharacterDetail } from "../detail/CharacterDetail";
import { LoreDetail } from "../detail/LoreDetail";
import { SceneDetail } from "../detail/SceneDetail";
import { AiChatPanel } from "./AiChatPanel";

// 인물/설정/씬 상세가 공유하는 껍데기. 뒤로가기 버튼 + 종류 배지 + 제목 구조가
// 세 곳에서 같아서 한 곳으로 모았다.
function DetailFrame({
    badge,
    title,
    onBack,
    children,
}: {
    badge: string;
    title: string;
    onBack: () => void;
    children: ReactNode;
}) {
    return (
        <div className="flex h-full flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
                <button
                    type="button"
                    onClick={onBack}
                    className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                    <ArrowLeft className="h-4 w-4 text-zinc-500" />
                </button>
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {badge}
                </span>
                <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {title}
                </h2>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto p-4 pb-40">
                {children}
            </div>
        </div>
    );
}

export function ContextPanel() {
    const t = useTranslation();
    const { detailPanel, setDetailPanel, characters, lores, scenes, chapters } =
        useEditorStore();
    const closeDetail = () => setDetailPanel(null);

    if (detailPanel?.type === "character") {
        const character = characters.find(
            (c) => c.id === detailPanel.characterId,
        );
        return (
            <DetailFrame
                badge={t("contextPanel_character")}
                title={character?.name ?? t("contextPanel_characterDetail")}
                onBack={closeDetail}
            >
                <CharacterDetail characterId={detailPanel.characterId} />
            </DetailFrame>
        );
    }

    if (detailPanel?.type === "lore") {
        const lore = lores.find((l) => l.id === detailPanel.loreId);
        return (
            <DetailFrame
                badge={t("contextPanel_lore")}
                title={lore?.name ?? t("contextPanel_loreDetail")}
                onBack={closeDetail}
            >
                <LoreDetail loreId={detailPanel.loreId} />
            </DetailFrame>
        );
    }

    if (detailPanel?.type === "scene") {
        const scene = scenes.find((s) => s.id === detailPanel.sceneId);
        return (
            <DetailFrame
                badge={t("contextPanel_scene")}
                title={scene?.title ?? t("contextPanel_sceneDetail")}
                onBack={closeDetail}
            >
                <SceneDetail sceneId={detailPanel.sceneId} />
            </DetailFrame>
        );
    }

    if (detailPanel?.type === "chapter") {
        const chapter = chapters.find((c) => c.id === detailPanel.chapterId);
        return (
            <DetailFrame
                badge={t("contextPanel_chapter")}
                title={chapter?.title ?? t("contextPanel_chapterDetail")}
                onBack={closeDetail}
            >
                <ChapterDetail chapterId={detailPanel.chapterId} />
            </DetailFrame>
        );
    }

    return <AiChatPanel />;
}
