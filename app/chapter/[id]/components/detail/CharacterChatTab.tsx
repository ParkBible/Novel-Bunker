"use client";

import { SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiRoutes } from "@/app/(shared)/routes";

interface ChatMessage {
    id: string;
    role: "user" | "model";
    text: string;
}

export function CharacterChatTab({
    character,
}: {
    character: { name: string; description: string; tags: string[] };
}) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

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

        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
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
                }),
            });

            const data = await response.json();
            setMessages((prev) => [
                ...prev,
                { id: crypto.randomUUID(), role: "model", text: data.reply },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: "model",
                    text: "응답을 생성하지 못했습니다.",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
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
                        {character.name}에게 말을 걸어보세요
                    </p>
                )}
                {messages.map((msg) => (
                    <div
                        key={msg.id}
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
                        입력 중...
                    </div>
                )}
            </div>

            <div className="flex gap-2 pt-1">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="메시지 입력..."
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
