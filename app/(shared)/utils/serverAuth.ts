import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// 서버 전용 인증 헬퍼: 소유자 구글 계정만 AI API를 쓸 수 있도록 세션 쿠키를 발급/검증한다.

export const REFRESH_COOKIE = "gdrive_refresh_token";
export const SESSION_COOKIE = "nb_session";
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

export function cookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge: COOKIE_MAX_AGE_SEC,
        path: "/",
    };
}

function sign(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("base64url");
}

// 세션 값: base64url("email|expiryMs") + "." + HMAC-SHA256 서명
export function createSessionValue(email: string, secret: string): string {
    const expiryMs = Date.now() + COOKIE_MAX_AGE_SEC * 1000;
    const payload = Buffer.from(`${email.toLowerCase()}|${expiryMs}`).toString(
        "base64url",
    );
    return `${payload}.${sign(payload, secret)}`;
}

// 유효하면 이메일, 아니면 null. 서명은 상수 시간 비교.
export function verifySessionValue(
    value: string | undefined,
    config: AuthConfig,
): string | null {
    if (!value) return null;
    const dot = value.lastIndexOf(".");
    if (dot <= 0) return null;
    const payload = value.slice(0, dot);
    const given = Buffer.from(value.slice(dot + 1));
    const expected = Buffer.from(sign(payload, config.sessionSecret));
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
        return null;
    }

    const decoded = Buffer.from(payload, "base64url").toString("utf8");
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
