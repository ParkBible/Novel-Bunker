import { NextRequest, NextResponse } from "next/server";
import { generateFeedback } from "@/app/(shared)/utils/gemini";

export async function POST(request: NextRequest) {
    try {
        const { sceneContent, synopsis, characters } = await request.json();

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
        );

        return NextResponse.json({ feedback });
    } catch (error) {
        console.error("Feedback API error:", error);
        return NextResponse.json(
            { error: "AI 피드백 생성에 실패했습니다." },
            { status: 500 },
        );
    }
}
