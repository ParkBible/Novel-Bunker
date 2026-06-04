import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

const REFRESH_COOKIE = "gdrive_refresh_token";

export async function POST(request: NextRequest) {
    const { code, codeVerifier, clientId, redirectUri } = await request.json();

    if (!code || !codeVerifier || !clientId || !redirectUri) {
        return NextResponse.json(
            { error: "파라미터가 부족합니다." },
            { status: 400 },
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
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
            code_verifier: codeVerifier,
        }),
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok || data.error) {
        return NextResponse.json(
            { error: data.error_description ?? data.error ?? "토큰 교환 실패" },
            { status: 400 },
        );
    }

    // refresh_token을 httpOnly 쿠키에 안전하게 저장
    if (data.refresh_token) {
        const cookieStore = await cookies();
        cookieStore.set(REFRESH_COOKIE, data.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30일
            path: "/",
        });
    }

    return NextResponse.json({ access_token: data.access_token });
}
