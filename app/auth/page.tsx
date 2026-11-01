"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    broadcastAuthToken,
    clearAuthReturnPath,
    clearPkceVerifier,
    getAuthReturnPath,
    getPkceVerifier,
    setAccessToken,
} from "@/app/(shared)/utils/googleDrive";

export default function AuthCallback() {
    const router = useRouter();
    // 허용되지 않은 계정 등 서버가 거절한 경우 창을 닫지 않고 이유를 보여준다
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isPopup, setIsPopup] = useState(false);

    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get("code");
        const popup = window.opener !== null && window.opener !== window;
        setIsPopup(popup);

        const finish = (token?: string) => {
            if (popup) {
                if (token) broadcastAuthToken(token);
                window.close();
            } else {
                if (token) setAccessToken(token);
                const returnPath = getAuthReturnPath();
                clearAuthReturnPath();
                router.replace(returnPath);
            }
        };

        if (!code) {
            finish();
            return;
        }

        const codeVerifier = getPkceVerifier();
        const redirectUri = `${window.location.origin}/auth`;

        if (!codeVerifier) {
            finish();
            return;
        }

        clearPkceVerifier();

        // code → token 교환 (서버가 허용된 계정인지 확인한 뒤 쿠키를 저장)
        fetch("/api/auth/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, codeVerifier, redirectUri }),
        })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    setErrorMessage(
                        data.error ??
                            "로그인에 실패했어요. 다시 시도해 주세요.",
                    );
                    return;
                }
                finish(data.access_token ?? undefined);
            })
            .catch(() => finish());
    }, [router]);

    const handleLeave = () => {
        if (isPopup) {
            window.close();
            return;
        }
        const returnPath = getAuthReturnPath();
        clearAuthReturnPath();
        router.replace(returnPath);
    };

    if (errorMessage) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-6 dark:bg-black">
                <p className="max-w-sm text-center text-sm leading-relaxed text-red-500">
                    {errorMessage}
                </p>
                <button
                    type="button"
                    onClick={handleLeave}
                    className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                    {isPopup ? "닫기" : "돌아가기"}
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
            <p className="text-sm text-zinc-400">인증 완료, 돌아가는 중...</p>
        </div>
    );
}
