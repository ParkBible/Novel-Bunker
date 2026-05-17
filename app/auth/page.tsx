"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
    broadcastAuthToken,
    clearAuthReturnPath,
    getAuthReturnPath,
    parseTokenFromHash,
    setAccessToken,
} from "@/app/(shared)/utils/googleDrive";

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        const token = parseTokenFromHash();

        // 팝업으로 열린 경우: 토큰을 원래 탭에 broadcast하고 창 닫기
        const isPopup = window.opener !== null && window.opener !== window;
        if (isPopup) {
            if (token) broadcastAuthToken(token);
            window.close();
            return;
        }

        // redirect 방식: 토큰 저장 후 원래 페이지로 복귀
        if (token) setAccessToken(token);
        const returnPath = getAuthReturnPath();
        clearAuthReturnPath();
        router.replace(returnPath);
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
            <p className="text-sm text-zinc-400">인증 완료, 돌아가는 중...</p>
        </div>
    );
}
