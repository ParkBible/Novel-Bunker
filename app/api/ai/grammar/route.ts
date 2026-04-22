import { type NextRequest, NextResponse } from "next/server";
import { checkGrammar } from "@/app/(shared)/utils/gemini";

export async function POST(request: NextRequest) {
    try {
        const { content, model, apiKey } = await request.json();

        if (!content) {
            return NextResponse.json(
                { error: "내용이 필요합니다." },
                { status: 400 },
            );
        }

        const suggestions = await checkGrammar(content, model, apiKey);

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error("Grammar API error:", error);
        return NextResponse.json(
            { error: "문법 검사에 실패했습니다." },
            { status: 500 },
        );
    }
}
