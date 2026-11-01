import { NextResponse } from "next/server";
import { getAuthConfig } from "@/app/(shared)/utils/serverAuth";

// 클라이언트가 OAuth 요청에 쓸 client ID. 서버의 GOOGLE_CLIENT_ID가 유일한 기준이다.
// (client ID는 비밀값이 아니라 브라우저에 노출돼도 된다)
export async function GET() {
    const config = getAuthConfig();
    if (!config) {
        return NextResponse.json(
            { error: "서버에 구글 로그인 설정이 없어요." },
            { status: 503 },
        );
    }
    return NextResponse.json({ clientId: config.clientId });
}
