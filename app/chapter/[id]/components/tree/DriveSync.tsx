"use client";

import { Download, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useGoogleDrive } from "@/app/(shared)/hooks/useGoogleDrive";
import { ClientIdGuideModal } from "./ClientIdGuideModal";

const SETTINGS_KEY = "googleClientId";

export function DriveSync() {
    const [clientId, setClientId] = useState<string | null>(null);
    const [isEditingClientId, setIsEditingClientId] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [gisReady, setGisReady] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // GIS 스크립트 로드 감지
    useEffect(() => {
        if (window.google) {
            setGisReady(true);
            return;
        }
        const handler = () => setGisReady(true);
        window.addEventListener("gis-loaded", handler);
        return () => window.removeEventListener("gis-loaded", handler);
    }, []);

    // 저장된 Client ID 불러오기
    useEffect(() => {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) setClientId(saved);
    }, []);

    useEffect(() => {
        if (isEditingClientId) inputRef.current?.focus();
    }, [isEditingClientId]);

    const handleSaveClientId = () => {
        const trimmed = inputValue.trim();
        if (!trimmed) return;
        localStorage.setItem(SETTINGS_KEY, trimmed);
        setClientId(trimmed);
        setIsEditingClientId(false);
        setInputValue("");
    };

    const {
        isConnected,
        syncStatus,
        errorMessage,
        upload,
        download,
        disconnect,
    } = useGoogleDrive(clientId ?? "");

    const isSyncing = syncStatus === "syncing";

    if (!gisReady) return null;

    // Client ID 미설정 또는 편집 중
    if (!clientId || isEditingClientId) {
        return (
            <>
                <div className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Google Drive 백업
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowGuide(true)}
                                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                title="발급 방법 안내"
                            >
                                발급 방법
                            </button>
                            {isEditingClientId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditingClientId(false);
                                        setInputValue("");
                                    }}
                                    className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                >
                                    취소
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="mb-2 text-xs text-zinc-400 dark:text-zinc-500">
                        Google Cloud Console에서 발급한 OAuth 2.0 클라이언트
                        ID를 입력하세요.
                    </p>
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) =>
                            e.key === "Enter" && handleSaveClientId()
                        }
                        placeholder="xxxxx.apps.googleusercontent.com"
                        className="mb-1.5 w-full rounded border border-zinc-200 bg-transparent px-2 py-1 text-xs text-zinc-700 placeholder-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:placeholder-zinc-600"
                    />
                    <button
                        type="button"
                        onClick={handleSaveClientId}
                        disabled={!inputValue.trim()}
                        className="w-full rounded bg-zinc-100 px-2 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                        저장
                    </button>
                </div>
                {showGuide && (
                    <ClientIdGuideModal onClose={() => setShowGuide(false)} />
                )}
            </>
        );
    }

    // 정상 화면
    return (
        <div className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Google Drive 백업
                </span>
                <div className="flex gap-2">
                    {isConnected && (
                        <button
                            type="button"
                            onClick={disconnect}
                            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        >
                            연결 해제
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setInputValue(clientId);
                            setIsEditingClientId(true);
                        }}
                        className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                        설정
                    </button>
                </div>
            </div>

            <div className="flex gap-1.5">
                <button
                    type="button"
                    onClick={upload}
                    disabled={isSyncing}
                    className="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    title="로컬 데이터를 Drive에 업로드"
                >
                    <Upload className="size-3.5" />
                    업로드
                </button>
                <button
                    type="button"
                    onClick={download}
                    disabled={isSyncing}
                    className="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    title="Drive에서 로컬로 다운로드 (현재 데이터 덮어쓰기)"
                >
                    <Download className="size-3.5" />
                    다운로드
                </button>
            </div>

            {isSyncing && (
                <p className="mt-1 text-center text-xs text-zinc-400">
                    동기화 중...
                </p>
            )}
            {syncStatus === "success" && (
                <p className="mt-1 text-center text-xs text-emerald-500">
                    완료되었습니다
                </p>
            )}
            {syncStatus === "error" && errorMessage && (
                <p
                    className="mt-1 text-center text-xs text-red-500"
                    title={errorMessage}
                >
                    오류:{" "}
                    {errorMessage.length > 30
                        ? `${errorMessage.slice(0, 30)}…`
                        : errorMessage}
                </p>
            )}
            {showGuide && (
                <ClientIdGuideModal onClose={() => setShowGuide(false)} />
            )}
        </div>
    );
}
