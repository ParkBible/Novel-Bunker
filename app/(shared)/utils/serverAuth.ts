import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// 서버 전용 인증 헬퍼: 소유자 구글 계정만 AI API를 쓸 수 있도록 세션 쿠키를 발급/검증한다.

// 세션·refresh 쿠키는 허브·레시피노트·메모노트와 같은 이름·형식(Hono 서명 쿠키)·SESSION_SECRET 으로 함께 쓴다.
// COOKIE_DOMAIN(예: park-bible.com)을 주면 하위 도메인 전체에 걸려 한 곳에서 로그인하면 다른 앱도 로그인된다
export const REFRESH_COOKIE = "pb_refresh";
export const SESSION_COOKIE = "pb_session";
export const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30일 (refresh 쿠키와 동일)

export const AI_LOGIN_REQUIRED_MESSAGE =
    "AI 기능은 구글 로그인 후에 쓸 수 있어요.";

const MIN_SESSION_SECRET_LENGTH = 32;

export interface AuthConfig {
    clientId: string;
    clientSecret: string;
    allowedEmails: string[];
    sessionSecret: string;
}

// 필수 환경변수가 하나라도 없으면 null (호출 측에서 fail closed 처리)
export function getAuthConfig(): AuthConfig | null {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const sessionSecret = process.env.SESSION_SECRET?.trim();
    const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

    if (
        !clientId ||
        !clientSecret ||
        !sessionSecret ||
        sessionSecret.length < MIN_SESSION_SECRET_LENGTH ||
        allowedEmails.length === 0
    ) {
        return null;
    }
    return { clientId, clientSecret, allowedEmails, sessionSecret };
}

// 배포 환경 여부: 여기서는 인증 설정이 없으면 무조건 막는다
export function isDeployedEnv(): boolean {
    return process.env.NODE_ENV === "production" || !!process.env.VERCEL;
}

export function isEmailAllowed(email: string, config: AuthConfig): boolean {
    return config.allowedEmails.includes(email.trim().toLowerCase());
}

const cookieDomain = () => process.env.COOKIE_DOMAIN?.trim() || undefined;

export function cookieOptions() {
    return {
        domain: cookieDomain(),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge: COOKIE_MAX_AGE_SEC,
        path: "/",
    };
}

// 쿠키 삭제도 같은 domain 으로 해야 하위 도메인 공용 쿠키가 지워진다
export function deleteAuthCookie(
    cookieStore: Awaited<ReturnType<typeof cookies>>,
    name: string,
) {
    cookieStore.delete({ name, path: "/", domain: cookieDomain() });
}

// Hono setSignedCookie 와 같은 형식: "값.base64(HMAC-SHA256)" — 허브·레시피노트 서버와 서로 읽을 수 있어야 한다
function sign(value: string, secret: string): string {
    return createHmac("sha256", secret).update(value).digest("base64");
}

export function signCookieValue(value: string, secret: string): string {
    return `${value}.${sign(value, secret)}`;
}

// 서명이 맞으면 원래 값, 아니면 null. 서명은 상수 시간 비교.
export function readSignedValue(
    signed: string | undefined,
    secret: string,
): string | null {
    if (!signed) return null;
    const dot = signed.lastIndexOf(".");
    if (dot <= 0) return null;
    const value = signed.slice(0, dot);
    const given = Buffer.from(signed.slice(dot + 1));
    const expected = Buffer.from(sign(value, secret));
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
        return null;
    }
    return value;
}

// 세션 값: "email|expiryMs" 를 서명한 것
export function createSessionValue(email: string, secret: string): string {
    const expiryMs = Date.now() + COOKIE_MAX_AGE_SEC * 1000;
    return signCookieValue(`${email.toLowerCase()}|${expiryMs}`, secret);
}

// 유효하면 이메일, 아니면 null. 서명은 상수 시간 비교.
export function verifySessionValue(
    value: string | undefined,
    config: AuthConfig,
): string | null {
    const decoded = readSignedValue(value, config.sessionSecret);
    if (!decoded) return null;
    const sep = decoded.lastIndexOf("|");
    if (sep <= 0) return null;
    const email = decoded.slice(0, sep);
    const expiryMs = Number(decoded.slice(sep + 1));
    if (!Number.isFinite(expiryMs) || expiryMs <= Date.now()) return null;
    // ALLOWED_EMAILS에서 빠진 계정은 기존 세션도 즉시 무효
    if (!isEmailAllowed(email, config)) return null;
    return email;
}

export async function getSessionEmail(
    config: AuthConfig,
): Promise<string | null> {
    const cookieStore = await cookies();
    return verifySessionValue(cookieStore.get(SESSION_COOKIE)?.value, config);
}

let warnedDevBypass = false;

// 모든 /api/ai/* 라우트가 맨 앞에서 호출한다. 통과면 null, 아니면 에러 응답.
export async function requireAiSession(): Promise<NextResponse | null> {
    const config = getAuthConfig();
    if (!config) {
        if (isDeployedEnv()) {
            return NextResponse.json(
                {
                    error: "서버 인증 설정이 완료되지 않아 AI 기능을 쓸 수 없어요.",
                },
                { status: 503 },
            );
        }
        // 로컬 개발에서 인증 환경변수가 없을 때만 통과시킨다
        if (!warnedDevBypass) {
            warnedDevBypass = true;
            console.warn(
                "[auth] 인증 환경변수가 없어 로컬 개발 모드로 AI API 인증을 건너뜁니다.",
            );
        }
        return null;
    }

    const email = await getSessionEmail(config);
    if (!email) {
        return NextResponse.json(
            { error: AI_LOGIN_REQUIRED_MESSAGE },
            { status: 401 },
        );
    }
    return null;
}
