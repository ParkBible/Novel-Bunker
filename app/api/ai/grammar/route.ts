import { type NextRequest, NextResponse } from "next/server";
import { AiServiceError, checkGrammar } from "@/app/(shared)/utils/deepseek";
import { requireAiSession } from "@/app/(shared)/utils/serverAuth";

export async function POST(request: NextRequest) {
    const denied = await requireAiSession();
    if (denied) return denied;

    try {
        const { content, model } = await request.json();

        if (!content) {
            return NextResponse.json(
                { error: "내용이 필요합니다." },
                { status: 400 },
            );
        }

        const suggestions = await checkGrammar(content, model);

        return NextResponse.json({ suggestions });
    } catch (error) {
        if (error instanceof AiServiceError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.status },
            );
        }
        console.error("Grammar API error:", error);
        return NextResponse.json(
            { error: "문법 검사에 실패했습니다." },
            { status: 500 },
        );
    }
}
