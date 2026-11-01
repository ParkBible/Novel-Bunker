import { NextResponse } from "next/server";
import { withAiRoute } from "@/app/(shared)/utils/aiRoute";
import { generateAiChatReply } from "@/app/(shared)/utils/deepseek";

export const POST = withAiRoute(
    async (request) => {
        const { messages, context, model } = await request.json();

        if (!Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: "메시지가 필요합니다." },
                { status: 400 },
            );
        }

        const reply = await generateAiChatReply(messages, context, model);
        return NextResponse.json({ reply });
    },
    { logLabel: "AI chat API", fallbackError: "AI 응답 생성에 실패했습니다." },
);
