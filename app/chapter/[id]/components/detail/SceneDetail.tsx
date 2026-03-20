"use client";

import { Calendar, CalendarPlus } from "lucide-react";
import { useCallback } from "react";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { AiFeedbackSection, SCENE_PROMPT_OPTIONS } from "./AiFeedbackSection";
import { MemoSection } from "./MemoSection";

export function SceneDetail({ sceneId }: { sceneId: number }) {
    const { scenes, updateSceneMemo } = useEditorStore();
    const scene = scenes.find((s) => s.id === sceneId);

    const handleSaveMemo = useCallback(
        async (memo: string) => {
            await updateSceneMemo(sceneId, memo);
        },
        [sceneId, updateSceneMemo],
    );

    if (!scene) {
        return (
            <p className="p-4 text-sm text-zinc-500">씬을 찾을 수 없습니다.</p>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    씬 정보
                </h3>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                        <CalendarPlus className="h-4 w-4 text-zinc-500" />
                        <span className="text-zinc-600 dark:text-zinc-400">
                            생성{" "}
                            {new Date(scene.createdAt).toLocaleDateString(
                                "ko-KR",
                            )}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-zinc-500" />
                        <span className="text-zinc-600 dark:text-zinc-400">
                            수정{" "}
                            {new Date(scene.updatedAt).toLocaleDateString(
                                "ko-KR",
                            )}
                        </span>
                    </div>
                </div>
            </div>

            <MemoSection value={scene.memo || ""} onSave={handleSaveMemo} />

            <AiFeedbackSection
                content={scene.content}
                promptOptions={SCENE_PROMPT_OPTIONS}
            />
        </div>
    );
}
