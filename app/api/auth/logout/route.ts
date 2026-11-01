import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import {
    REFRESH_COOKIE,
    SESSION_COOKIE,
} from "@/app/(shared)/utils/serverAuth";

// 요청 출처 확인 (CSRF 방지): Origin, 없으면 Referer가 이 앱과 같은 출처여야 한다
function isSameOrigin(request: NextRequest): boolean {
    const expected = request.nextUrl.origin;
    const origin = request.headers.get("origin");
    if (origin) return origin === expected;
    const referer = request.headers.get("referer");
    if (!referer) return false;
    try {
        return new URL(referer).origin === expected;
    } catch {
        return false;
    }
}

// 연결 해제: 서버에 저장된 refresh_token 쿠키와 세션 쿠키를 삭제한다.
export async function POST(request: NextRequest) {
    if (!isSameOrigin(request)) {
        return NextResponse.json(
            { error: "허용되지 않은 요청이에요." },
            { status: 403 },
        );
    }
    const cookieStore = await cookies();
    cookieStore.delete(REFRESH_COOKIE);
    cookieStore.delete(SESSION_COOKIE);
    return NextResponse.json({ ok: true });
}
