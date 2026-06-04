"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
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

    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get("code");
        const isPopup = window.opener !== null && window.opener !== window;

        const finish = (token?: string) => {
            if (isPopup) {
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
        const clientId = localStorage.getItem("googleClientId");
        const redirectUri = `${window.location.origin}/auth`;

        if (!codeVerifier || !clientId) {
            finish();
            return;
        }

        clearPkceVerifier();

        // code → token 교환 (서버가 refresh_token을 httpOnly 쿠키에 저장)
        fetch("/api/auth/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, codeVerifier, clientId, redirectUri }),
        })
            .then((res) => res.json())
            .then((data) => finish(data.access_token ?? undefined))
            .catch(() => finish());
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
            <p className="text-sm text-zinc-400">인증 완료, 돌아가는 중...</p>
        </div>
    );
}
