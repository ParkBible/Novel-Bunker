import { type NextRequest, NextResponse } from "next/server";
import {
    AiServiceError,
    chatWithCharacter,
} from "@/app/(shared)/utils/deepseek";
import { requireAiSession } from "@/app/(shared)/utils/serverAuth";

export async function POST(request: NextRequest) {
    const denied = await requireAiSession();
    if (denied) return denied;

    try {
        const {
            characterName,
            characterDescription,
            characterTags,
            messages,
            model,
        } = await request.json();

        if (
            !characterName ||
            !Array.isArray(messages) ||
            messages.length === 0
        ) {
            return NextResponse.json(
                { error: "인물 정보와 메시지가 필요합니다." },
                { status: 400 },
            );
        }

        const reply = await chatWithCharacter(
            characterName,
            characterDescription || "",
            characterTags || [],
            messages,
            model,
        );

        return NextResponse.json({ reply });
    } catch (error) {
        if (error instanceof AiServiceError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.status },
            );
        }
        console.error("Character chat API error:", error);
        return NextResponse.json(
            { error: "캐릭터 대화 생성에 실패했습니다." },
            { status: 500 },
        );
    }
}
