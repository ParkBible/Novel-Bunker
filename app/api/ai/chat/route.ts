import { type NextRequest, NextResponse } from "next/server";
import {
    AiServiceError,
    generateAiChatReply,
} from "@/app/(shared)/utils/deepseek";
import { requireAiSession } from "@/app/(shared)/utils/serverAuth";

export async function POST(request: NextRequest) {
    const denied = await requireAiSession();
    if (denied) return denied;

    try {
        const { messages, context, model } = await request.json();

        if (!Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: "메시지가 필요합니다." },
                { status: 400 },
            );
        }

        const reply = await generateAiChatReply(messages, context, model);
        return NextResponse.json({ reply });
    } catch (error) {
        if (error instanceof AiServiceError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.status },
            );
        }
        console.error("AI chat API error:", error);
        return NextResponse.json(
            { error: "AI 응답 생성에 실패했습니다." },
            { status: 500 },
        );
    }
}
