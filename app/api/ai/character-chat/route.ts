import { type NextRequest, NextResponse } from "next/server";
import { chatWithCharacter } from "@/app/(shared)/utils/gemini";

export async function POST(request: NextRequest) {
    try {
        const { characterName, characterDescription, characterTags, messages } =
            await request.json();

        if (!characterName || !messages) {
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
        );

        return NextResponse.json({ reply });
    } catch (error) {
        console.error("Character chat API error:", error);
        return NextResponse.json(
            { error: "캐릭터 대화 생성에 실패했습니다." },
            { status: 500 },
        );
    }
}
