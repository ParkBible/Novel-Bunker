"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import {
    broadcastAuthToken,
    clearAuthReturnPath,
    clearPendingAction,
    clearPkceVerifier,
    getAuthReturnPath,
    getPkceVerifier,
    markLoginCompleted,
    setAccessToken,
} from "@/app/(shared)/utils/googleDrive";

export default function AuthCallback() {
    const router = useRouter();
    const t = useTranslation();
    // 허용되지 않은 계정 등 서버가 거절한 경우 창을 닫지 않고 이유를 보여준다
    // (null: 오류 없음, "": 서버 메시지 없이 실패 → 기본 문구)
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isPopup, setIsPopup] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        // OAuth state = 로그인 시작 시 만든 loginId. 보류 액션과 짝을 맞추는 데 쓴다.
        const loginId = params.get("state") ?? "";
        const popup = window.opener !== null && window.opener !== window;
        setIsPopup(popup);

        const finish = (token?: string) => {
            if (popup) {
                if (token) broadcastAuthToken(token, loginId);
                window.close();
            } else {
                if (token) {
                    setAccessToken(token);
                    markLoginCompleted(loginId);
                } else {
                    // 로그인 실패/취소: 이 로그인을 기다리던 보류 액션을 버린다
                    clearPendingAction();
                }
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
                    if (!popup) clearPendingAction();
                    setErrorMessage(
                        typeof data.error === "string" ? data.error : "",
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

    if (errorMessage !== null) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-6 dark:bg-black">
                <p className="max-w-sm text-center text-sm leading-relaxed text-red-500">
                    {errorMessage || t("auth_loginFailed")}
                </p>
                <button
                    type="button"
                    onClick={handleLeave}
                    className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                    {isPopup ? t("auth_close") : t("auth_back")}
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
            <p className="text-sm text-zinc-400">{t("auth_returning")}</p>
        </div>
    );
}
