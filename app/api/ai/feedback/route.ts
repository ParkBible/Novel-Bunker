import { type NextRequest, NextResponse } from "next/server";
import {
    AiServiceError,
    generateFeedback,
} from "@/app/(shared)/utils/deepseek";
import { requireAiSession } from "@/app/(shared)/utils/serverAuth";

export async function POST(request: NextRequest) {
    const denied = await requireAiSession();
    if (denied) return denied;

    try {
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
    } catch (error) {
        if (error instanceof AiServiceError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.status },
            );
        }
        console.error("Feedback API error:", error);
        return NextResponse.json(
            { error: "AI 피드백 생성에 실패했습니다." },
            { status: 500 },
        );
    }
}
