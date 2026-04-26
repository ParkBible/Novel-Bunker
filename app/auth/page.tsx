"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
    clearAuthReturnPath,
    getAuthReturnPath,
    parseTokenFromHash,
    setAccessToken,
} from "@/app/(shared)/utils/googleDrive";

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        const token = parseTokenFromHash();
        if (token) {
            setAccessToken(token);
        }
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
