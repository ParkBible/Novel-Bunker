import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
    getAuthConfig,
    getSessionEmail,
    REFRESH_COOKIE,
} from "@/app/(shared)/utils/serverAuth";

export async function POST() {
    const config = getAuthConfig();
    if (!config) {
        return NextResponse.json(
            { error: "서버에 구글 로그인 설정이 완료되지 않았어요." },
            { status: 503 },
        );
    }

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

    // 유효한 세션(허용된 계정으로 로그인한 기록)이 있어야만 갱신해 준다.
    // refresh 쿠키만 있고 세션이 없으면(세션 도입 전 로그인 등) 재로그인 안내용 코드를 준다.
    const email = await getSessionEmail(config);
    if (!email) {
        return NextResponse.json(
            {
                error: "세션 없음 — 재로그인 필요",
                ...(refreshToken ? { code: "session_required" } : {}),
            },
            { status: 401 },
        );
    }

    if (!refreshToken) {
        return NextResponse.json(
            { error: "refresh_token 없음 — 재로그인 필요" },
            { status: 401 },
        );
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            grant_type: "refresh_token",
        }),
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok || data.error) {
        // 토큰이 만료/폐기된 경우 쿠키 삭제
        if (data.error === "invalid_grant") {
            cookieStore.delete(REFRESH_COOKIE);
        }
        return NextResponse.json(
            { error: data.error_description ?? data.error ?? "갱신 실패" },
            { status: 401 },
        );
    }

    return NextResponse.json({ access_token: data.access_token });
}
