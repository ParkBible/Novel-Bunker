"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { AiLoginNotice } from "@/app/(shared)/components/AiLoginNotice";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { apiRoutes } from "@/app/(shared)/routes";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { AiAuthError, postAi } from "@/app/(shared)/utils/aiClient";

export type PromptOption = { labelKey: string; value: string };

export const CHAPTER_PROMPT_OPTIONS: PromptOption[] = [
    {
        labelKey: "aiFeedback_transitionLabel",
        value: "씬 간 전환이 자연스러운지, 흐름이 끊기는 곳은 없는지 검사해주세요.",
    },
    {
        labelKey: "aiFeedback_foreshadowingLabel",
        value: "깔아놓고 회수하지 않은 복선이나, 갑자기 튀어나온 설정이 있는지 검사해주세요.",
    },
    {
        labelKey: "aiFeedback_pacingLabel",
        value: "전개 속도가 너무 빠르거나 느린 구간이 있는지 분석해주세요.",
    },
    {
        labelKey: "aiFeedback_voiceLabel",
        value: "챕터 내에서 인물의 말투, 성격, 행동이 일관되게 유지되는지 검사해주세요.",
    },
    {
        labelKey: "aiFeedback_repetitionLabel",
        value: "반복적으로 사용된 유사한 표현이나 문장 패턴을 찾아주세요.",
    },
];

export function AiFeedbackSection({
    content,
    promptOptions,
}: {
    content: string;
    promptOptions: PromptOption[];
}) {
    const t = useTranslation();
    const { synopsis, isLoadingAI, setIsLoadingAI, aiModel } = useEditorStore();
    const [feedback, setFeedback] = useState<string>("");
    const [authRequired, setAuthRequired] = useState(false);
    const [selectedPrompt, setSelectedPrompt] = useState<string>(
        promptOptions[0].value,
    );

    const handleRequestFeedback = async () => {
        try {
            setIsLoadingAI(true);

            const data = await postAi<{ feedback: string }>(
                apiRoutes.aiFeedback,
                {
                    sceneContent: content,
                    synopsis,
                    prompt: selectedPrompt,
                    model: aiModel,
                },
                "피드백을 가져오는 중 오류가 발생했습니다.",
            );
            setAuthRequired(false);
            setFeedback(data.feedback);
        } catch (error) {
            if (error instanceof AiAuthError) {
                setAuthRequired(true);
                return;
            }
            console.error("AI 피드백 요청 실패:", error);
            setFeedback(
                error instanceof Error && error.message
                    ? error.message
                    : "피드백을 가져오는 중 오류가 발생했습니다.",
            );
        } finally {
            setIsLoadingAI(false);
        }
    };

    return (
        <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("aiFeedback_title")}
            </h3>
            <div className="mb-3 flex flex-wrap gap-1.5">
                {promptOptions.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => setSelectedPrompt(option.value)}
                        className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                            selectedPrompt === option.value
                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        }`}
                    >
                        {t(option.labelKey as Parameters<typeof t>[0])}
                    </button>
                ))}
            </div>
            <button
                type="button"
                onClick={handleRequestFeedback}
                disabled={isLoadingAI}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-300 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-800"
            >
                <Sparkles className="h-3 w-3" />
                {isLoadingAI ? t("generating") : t("aiFeedback_request")}
            </button>

            {authRequired && (
                <div className="mt-3">
                    <AiLoginNotice onLoggedIn={() => setAuthRequired(false)} />
                </div>
            )}

            {feedback ? (
                <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    {feedback}
                </div>
            ) : (
                <p className="mt-3 text-center text-xs text-zinc-400">
                    {t("aiFeedback_hint")}
                </p>
            )}
        </div>
    );
}
