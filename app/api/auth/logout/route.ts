import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const REFRESH_COOKIE = "gdrive_refresh_token";

// 연결 해제: 서버에 저장된 refresh_token 쿠키를 삭제한다.
export async function POST() {
    const cookieStore = await cookies();
    cookieStore.delete(REFRESH_COOKIE);
    return NextResponse.json({ ok: true });
}
