"use client";

import { Calendar, Sparkles, Type } from "lucide-react";
import { useState } from "react";
import { apiRoutes } from "@/app/(shared)/routes";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";

export function ContextPanel() {
    const { getSelectedScene, synopsis, isLoadingAI } = useEditorStore();
    const selectedScene = getSelectedScene();
    const [feedback, setFeedback] = useState<string>("");

    const handleRequestFeedback = async () => {
        if (!selectedScene) return;

        try {
            useEditorStore.setState({ isLoadingAI: true });

            const response = await fetch(apiRoutes.aiFeedback, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sceneContent: selectedScene.content,
                    synopsis,
                    characters: selectedScene.characters,
                }),
            });

            const data = await response.json();
            setFeedback(data.feedback);
        } catch (error) {
            console.error("AI 피드백 요청 실패:", error);
            setFeedback("피드백을 가져오는 중 오류가 발생했습니다.");
        } finally {
            useEditorStore.setState({ isLoadingAI: false });
        }
    };

    if (!selectedScene) {
        return (
            <div className="flex h-full flex-col border-l border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex flex-col items-center justify-center flex-1 text-center">
                    <Sparkles className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-4" />
                    <p className="text-sm text-zinc-500 dark:text-zinc-500">
                        씬을 선택하여 세부 정보를 확인하세요
                    </p>
                </div>
            </div>
        );
    }

    const plainText = selectedScene.content.replace(/<[^>]*>/g, "");
    const wordCount = plainText.length;

    return (
        <div className="flex h-full flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    씬 정보
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                        <Type className="h-4 w-4 text-zinc-500" />
                        <span className="text-zinc-600 dark:text-zinc-400">
                            {wordCount.toLocaleString()}자
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-zinc-500" />
                        <span className="text-zinc-600 dark:text-zinc-400">
                            {new Date(
                                selectedScene.updatedAt,
                            ).toLocaleDateString("ko-KR")}
                        </span>
                    </div>
                </div>

                <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                        등장인물
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {selectedScene.characters.length > 0 ? (
                            selectedScene.characters.map((char) => (
                                <span
                                    key={char}
                                    className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                >
                                    {char}
                                </span>
                            ))
                        ) : (
                            <p className="text-sm text-zinc-500">
                                등장인물이 없습니다
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                            AI 피드백
                        </h3>
                        <button
                            type="button"
                            onClick={handleRequestFeedback}
                            disabled={isLoadingAI}
                            className="flex items-center gap-1 rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-300 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-800"
                        >
                            <Sparkles className="h-3 w-3" />
                            {isLoadingAI ? "생성 중..." : "피드백 요청"}
                        </button>
                    </div>

                    {feedback ? (
                        <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                            {feedback}
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-500">
                            버튼을 클릭하여 AI 피드백을 받아보세요
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
