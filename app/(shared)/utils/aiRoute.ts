import { type NextRequest, NextResponse } from "next/server";
import { AiServiceError } from "./deepseek";
import { requireAiSession } from "./serverAuth";

// /api/ai/* 공통 래퍼: 세션 확인 → 핸들러 실행 → AiServiceError를 응답으로 변환.
// 핸들러는 성공 응답(또는 400 등 검증 실패 응답)만 신경 쓰면 된다.
export function withAiRoute(
    handler: (request: NextRequest) => Promise<NextResponse>,
    options: { logLabel: string; fallbackError: string },
) {
    return async (request: NextRequest): Promise<NextResponse> => {
        const denied = await requireAiSession();
        if (denied) return denied;

        try {
            return await handler(request);
        } catch (error) {
            if (error instanceof AiServiceError) {
                return NextResponse.json(
                    { error: error.message },
                    { status: error.status },
                );
            }
            console.error(`${options.logLabel} error:`, error);
            return NextResponse.json(
                { error: options.fallbackError },
                { status: 500 },
            );
        }
    };
}
