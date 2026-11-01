"use client";

import { LogIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/TranslationProvider";
import { listenForAuthToken, redirectToAuth } from "../utils/googleDrive";

// AI API가 401을 돌려줬을 때 보여주는 안내. Drive 백업과 같은 구글 로그인 흐름을 쓴다.
export function AiLoginNotice({ onLoggedIn }: { onLoggedIn: () => void }) {
    const t = useTranslation();
    const [error, setError] = useState<string | null>(null);

    // 팝업 로그인이 끝나면(토큰 브로드캐스트) 안내를 닫는다.
    // 콜백은 ref로 들고 있어 렌더마다 채널을 다시 열지 않는다.
    const onLoggedInRef = useRef(onLoggedIn);
    onLoggedInRef.current = onLoggedIn;
    useEffect(() => listenForAuthToken(() => onLoggedInRef.current()), []);

    const handleLogin = async () => {
        setError(null);
        try {
            await redirectToAuth();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    return (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 dark:border-amber-800 dark:bg-amber-950">
            <p className="mb-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                {t("aiAuth_required")}
            </p>
            <button
                type="button"
                onClick={handleLogin}
                className="flex w-full items-center justify-center gap-1.5 rounded bg-amber-500 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-600"
            >
                <LogIn className="h-3 w-3" />
                {t("aiAuth_login")}
            </button>
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>
    );
}
