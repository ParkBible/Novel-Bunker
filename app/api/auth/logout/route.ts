import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
    REFRESH_COOKIE,
    SESSION_COOKIE,
} from "@/app/(shared)/utils/serverAuth";

// 연결 해제: 서버에 저장된 refresh_token 쿠키와 세션 쿠키를 삭제한다.
export async function POST() {
    const cookieStore = await cookies();
    cookieStore.delete(REFRESH_COOKIE);
    cookieStore.delete(SESSION_COOKIE);
    return NextResponse.json({ ok: true });
}
