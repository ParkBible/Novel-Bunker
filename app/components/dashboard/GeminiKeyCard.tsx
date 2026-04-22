"use client";

import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";

export function GeminiKeyCard() {
    const { geminiApiKey, setGeminiApiKey } = useEditorStore();
    const [draft, setDraft] = useState(geminiApiKey);
    const [show, setShow] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        await setGeminiApiKey(draft.trim());
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const isSet = !!geminiApiKey;

    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-zinc-500" />
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Gemini API 키
                </h2>
                {isSet && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        설정됨
                    </span>
                )}
            </div>
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                AI 피드백, 문법 검사, 캐릭터 대화 기능에 사용됩니다.{" "}
                <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                    Google AI Studio
                </a>
                에서 무료로 발급받을 수 있습니다.
            </p>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type={show ? "text" : "password"}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="AIza..."
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 pr-9 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-zinc-500"
                    />
                    <button
                        type="button"
                        onClick={() => setShow((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                        {show ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={draft.trim() === geminiApiKey}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                    {saved ? "저장됨" : "저장"}
                </button>
            </div>
        </div>
    );
}
