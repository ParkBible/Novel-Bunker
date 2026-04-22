import { type NextRequest, NextResponse } from "next/server";
import { generateAiChatReply } from "@/app/(shared)/utils/gemini";

export async function POST(request: NextRequest) {
    try {
        const { messages, context, model, apiKey } = await request.json();

        if (!messages || messages.length === 0) {
            return NextResponse.json(
                { error: "메시지가 필요합니다." },
                { status: 400 },
            );
        }

        const reply = await generateAiChatReply(
            messages,
            context,
            model,
            apiKey,
        );
        return NextResponse.json({ reply });
    } catch (error) {
        console.error("AI chat API error:", error);
        return NextResponse.json(
            { error: "AI 응답 생성에 실패했습니다." },
            { status: 500 },
        );
    }
}
