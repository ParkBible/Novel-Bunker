"use client";

import { useCallback } from "react";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { AiFeedbackSection, CHAPTER_PROMPT_OPTIONS } from "./AiFeedbackSection";
import { MemoSection } from "./MemoSection";

export function ChapterDetail({ chapterId }: { chapterId: number }) {
    const { chapters, scenes, updateChapterMemo } = useEditorStore();
    const chapter = chapters.find((c) => c.id === chapterId);

    const handleSaveMemo = useCallback(
        async (memo: string) => {
            await updateChapterMemo(chapterId, memo);
        },
        [chapterId, updateChapterMemo],
    );

    if (!chapter) {
        return (
            <p className="p-4 text-sm text-zinc-500">
                챕터를 찾을 수 없습니다.
            </p>
        );
    }

    const chapterScenes = scenes
        .filter((s) => s.chapterId === chapterId)
        .sort((a, b) => a.order - b.order);

    const combinedContent = chapterScenes.map((s) => s.content).join("\n\n");

    return (
        <div className="space-y-6">
            <MemoSection value={chapter.memo || ""} onSave={handleSaveMemo} />

            <AiFeedbackSection
                content={combinedContent}
                promptOptions={CHAPTER_PROMPT_OPTIONS}
            />
        </div>
    );
}
