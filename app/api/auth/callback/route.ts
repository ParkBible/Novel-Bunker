import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import {
    cookieOptions,
    createSessionValue,
    getAuthConfig,
    isEmailAllowed,
    REFRESH_COOKIE,
    SESSION_COOKIE,
} from "@/app/(shared)/utils/serverAuth";

const NOT_ALLOWED_MESSAGE =
    "허용되지 않은 구글 계정이에요. 이 앱은 소유자 계정으로만 로그인할 수 있어요.";

interface IdTokenClaims {
    iss?: string;
    aud?: string;
    email?: string;
    email_verified?: boolean;
}

// id_token은 구글 토큰 엔드포인트에서 TLS로 직접 받은 값이므로
// 서명 검증 없이 payload만 디코드해도 된다 (OpenID Connect Core 3.1.3.7).
// 다른 경로(클라이언트 등)에서 받은 id_token에는 이 함수를 쓰면 안 된다.
function decodeIdTokenPayload(idToken: unknown): IdTokenClaims | null {
    if (typeof idToken !== "string") return null;
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    try {
        return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    } catch {
        return null;
    }
}

// 허용되지 않은 계정에 발급된 토큰은 바로 폐기한다 (실패해도 무시)
async function revokeToken(token: unknown): Promise<void> {
    if (typeof token !== "string" || !token) return;
    try {
        await fetch("https://oauth2.googleapis.com/revoke", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ token }),
        });
    } catch {
        // 무시
    }
}

export async function POST(request: NextRequest) {
    const { code, codeVerifier, redirectUri } = await request.json();

    if (!code || !codeVerifier || !redirectUri) {
        return NextResponse.json(
            { error: "파라미터가 부족합니다." },
            { status: 400 },
        );
    }

    const config = getAuthConfig();
    if (!config) {
        return NextResponse.json(
            { error: "서버에 구글 로그인 설정이 완료되지 않았어요." },
            { status: 503 },
        );
    }

    // client ID는 클라이언트 입력을 무시하고 서버 환경변수만 사용한다
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
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

    const claims = decodeIdTokenPayload(data.id_token);
    const email = typeof claims?.email === "string" ? claims.email : "";
    const isAllowed =
        !!claims &&
        (claims.iss === "https://accounts.google.com" ||
            claims.iss === "accounts.google.com") &&
        claims.aud === config.clientId &&
        claims.email_verified === true &&
        !!email &&
        isEmailAllowed(email, config);

    if (!isAllowed) {
        // 쿠키를 하나도 설정하지 않고 토큰도 돌려주지 않는다
        await revokeToken(data.refresh_token ?? data.access_token);
        return NextResponse.json(
            { error: NOT_ALLOWED_MESSAGE },
            { status: 403 },
        );
    }

    const cookieStore = await cookies();
    // refresh_token은 httpOnly 쿠키에 안전하게 저장
    if (data.refresh_token) {
        cookieStore.set(REFRESH_COOKIE, data.refresh_token, cookieOptions());
    }
    // AI API 접근용 세션 (email|만료시각, HMAC 서명)
    cookieStore.set(
        SESSION_COOKIE,
        createSessionValue(email, config.sessionSecret),
        cookieOptions(),
    );

    return NextResponse.json({ access_token: data.access_token });
}
