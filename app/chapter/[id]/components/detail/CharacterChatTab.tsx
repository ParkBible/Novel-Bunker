"use client";

import { SendHorizontal, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { characterMessageOps } from "@/app/(shared)/db/operations";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import {
    apiRoutes,
    GEMINI_MODELS,
    type GeminiModelId,
} from "@/app/(shared)/routes";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";

interface ChatMessage {
    id?: number;
    role: "user" | "model";
    text: string;
}

export function CharacterChatTab({
    character,
}: {
    character: {
        id: number;
        name: string;
        description: string;
        tags: string[];
    };
}) {
    const t = useTranslation();
    const { geminiModel, setGeminiModel, dataVersion, geminiApiKey } =
        useEditorStore();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // biome-ignore lint/correctness/useExhaustiveDependencies: dataVersion은 Drive 다운로드 후 강제 리로드 트리거용
    useEffect(() => {
        characterMessageOps.getByCharacter(character.id).then((saved) => {
            setMessages(
                saved.map((m) => ({ id: m.id, role: m.role, text: m.text })),
            );
        });
    }, [character.id, dataVersion]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: messages 변경 시 스크롤 트리거용 의존성
    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages]);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        const savedId = await characterMessageOps.create(
            character.id,
            "user",
            trimmed,
        );
        const userMessage: ChatMessage = {
            id: savedId,
            role: "user",
            text: trimmed,
        };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput("");

        setIsLoading(true);
        try {
            const response = await fetch(apiRoutes.characterChat, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    characterName: character.name,
                    characterDescription: character.description,
                    characterTags: character.tags,
                    messages: updatedMessages,
                    model: geminiModel,
                    apiKey: geminiApiKey,
                }),
            });
            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            const replyId = await characterMessageOps.create(
                character.id,
                "model",
                data.reply,
            );
            setMessages((prev) => [
                ...prev,
                { id: replyId, role: "model", text: data.reply },
            ]);
        } catch {
            const errorText = t("characterChat_error");
            const errId = await characterMessageOps.create(
                character.id,
                "model",
                errorText,
            );
            setMessages((prev) => [
                ...prev,
                {
                    id: errId,
                    role: "model",
                    text: errorText,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = async () => {
        await characterMessageOps.clearByCharacter(character.id);
        setMessages([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div
                ref={scrollRef}
                className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto"
            >
                {messages.length === 0 && (
                    <p className="py-4 text-center text-xs text-zinc-400">
                        {t("characterChat_emptyState", {
                            name: character.name,
                        })}
                    </p>
                )}
                {messages.map((msg, i) => (
                    <div
                        key={msg.id ?? i}
                        className={`rounded-lg px-3 py-2 text-sm ${
                            msg.role === "user"
                                ? "ml-6 self-end bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                : "mr-6 self-start bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                    >
                        {msg.text}
                    </div>
                ))}
                {isLoading && (
                    <div className="mr-6 self-start rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-400 dark:bg-zinc-800">
                        {t("characterChat_typing")}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1.5 pb-1">
                <select
                    value={geminiModel}
                    onChange={(e) =>
                        setGeminiModel(e.target.value as GeminiModelId)
                    }
                    className="rounded px-1.5 py-0.5 text-xs bg-zinc-100 text-zinc-600 outline-none cursor-pointer hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    title={t("chat_selectModel")}
                >
                    {GEMINI_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.label}
                        </option>
                    ))}
                </select>
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={handleClear}
                    disabled={messages.length === 0 || isLoading}
                    className="rounded-lg border border-zinc-200 px-2.5 text-zinc-400 transition-colors hover:border-red-300 hover:text-red-400 disabled:opacity-30 dark:border-zinc-700 dark:hover:border-red-700 dark:hover:text-red-500"
                    title={t("characterChat_reset")}
                >
                    <Trash2 className="h-4 w-4" />
                </button>
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("characterChat_inputPlaceholder")}
                    rows={1}
                    className="flex-1 resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-zinc-500"
                />
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="rounded-lg bg-zinc-900 px-2.5 text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-300 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-800"
                >
                    <SendHorizontal className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
