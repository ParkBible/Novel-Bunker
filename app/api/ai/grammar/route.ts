import { NextResponse } from "next/server";
import { withAiRoute } from "@/app/(shared)/utils/aiRoute";
import { checkGrammar } from "@/app/(shared)/utils/deepseek";

export const POST = withAiRoute(
    async (request) => {
        const { content, model } = await request.json();

        if (!content) {
            return NextResponse.json(
                { error: "내용이 필요합니다." },
                { status: 400 },
            );
        }

        const suggestions = await checkGrammar(content, model);
        return NextResponse.json({ suggestions });
    },
    { logLabel: "Grammar API", fallbackError: "문법 검사에 실패했습니다." },
);
