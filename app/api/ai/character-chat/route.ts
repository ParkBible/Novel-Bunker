import { NextResponse } from "next/server";
import { withAiRoute } from "@/app/(shared)/utils/aiRoute";
import { chatWithCharacter } from "@/app/(shared)/utils/deepseek";

export const POST = withAiRoute(
    async (request) => {
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
    },
    {
        logLabel: "Character chat API",
        fallbackError: "캐릭터 대화 생성에 실패했습니다.",
    },
);
