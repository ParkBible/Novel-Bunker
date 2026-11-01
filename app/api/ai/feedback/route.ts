import { NextResponse } from "next/server";
import { withAiRoute } from "@/app/(shared)/utils/aiRoute";
import { generateFeedback } from "@/app/(shared)/utils/deepseek";

export const POST = withAiRoute(
    async (request) => {
        const { sceneContent, synopsis, characters, prompt, model } =
            await request.json();

        if (!sceneContent) {
            return NextResponse.json(
                { error: "씬 내용이 필요합니다." },
                { status: 400 },
            );
        }

        const feedback = await generateFeedback(
            sceneContent,
            synopsis || "",
            characters || [],
            prompt,
            model,
        );

        return NextResponse.json({ feedback });
    },
    {
        logLabel: "Feedback API",
        fallbackError: "AI 피드백 생성에 실패했습니다.",
    },
);
