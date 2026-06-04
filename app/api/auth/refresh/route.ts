import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

const REFRESH_COOKIE = "gdrive_refresh_token";

export async function POST(request: NextRequest) {
    const { clientId } = await request.json();

    if (!clientId) {
        return NextResponse.json(
            { error: "clientId가 필요합니다." },
            { status: 400 },
        );
    }

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

    if (!refreshToken) {
        return NextResponse.json(
            { error: "refresh_token 없음 — 재로그인 필요" },
            { status: 401 },
        );
    }

    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientSecret) {
        return NextResponse.json(
            { error: "서버에 GOOGLE_CLIENT_SECRET이 설정되지 않았습니다." },
            { status: 500 },
        );
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
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
