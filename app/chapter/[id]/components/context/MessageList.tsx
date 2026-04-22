"use client";

import { FileText, Sparkles } from "lucide-react";
import type { RefObject } from "react";
import type { AiMessage } from "@/app/(shared)/db";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";

interface Props {
    messages: AiMessage[];
    isLoading: boolean;
    scrollRef: RefObject<HTMLDivElement | null>;
}

export function MessageList({ messages, isLoading, scrollRef }: Props) {
    const t = useTranslation();
    return (
        <div
            ref={scrollRef}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3"
        >
            {messages.length === 0 && !isLoading && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8">
                    <Sparkles className="h-8 w-8 text-zinc-200 dark:text-zinc-700" />
                    <p className="text-center text-xs text-zinc-400">
                        <span className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-zinc-500 dark:bg-zinc-800">
                            @
                        </span>{" "}
                        {t("chat_contextHint")}
                    </p>
                </div>
            )}

            {messages.map((msg) => (
                <div
                    key={msg.id}
                    className={`flex flex-col gap-1 ${
                        msg.role === "user" ? "items-end" : "items-start"
                    }`}
                >
                    {msg.contextTitle && (
                        <div className="flex max-w-[85%] items-start gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 dark:border-zinc-700 dark:bg-zinc-800/50">
                            <FileText className="mt-0.5 h-3 w-3 shrink-0 text-zinc-400" />
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                    {msg.contextTitle}
                                </p>
                                {msg.contextContent && (
                                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400 dark:text-zinc-500">
                                        {msg.contextContent
                                            .replace(/<[^>]*>/g, "")
                                            .replace(/\[.*?\]/g, "")
                                            .trim()
                                            .slice(0, 80)}
                                        …
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                            msg.role === "user"
                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                    >
                        {msg.text}
                    </div>
                </div>
            ))}

            {isLoading && (
                <div className="flex items-start">
                    <div className="rounded-xl bg-zinc-100 px-3 py-2 text-sm text-zinc-400 dark:bg-zinc-800">
                        {t("chat_typing")}
                    </div>
                </div>
            )}
        </div>
    );
}
