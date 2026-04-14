"use client";

import { SendHorizontal, User } from "lucide-react";
import { useRef, useState } from "react";
import { apiRoutes } from "@/app/(shared)/routes";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";

interface ChatMessage {
    role: "user" | "model";
    text: string;
}

function CharacterChat({
    character,
}: {
    character: { name: string; description: string; tags: string[] };
}) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        const userMessage: ChatMessage = { role: "user", text: trimmed };
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
                { role: "model", text: data.reply },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "model", text: "응답을 생성하지 못했습니다." },
            ]);
        } finally {
            setIsLoading(false);
            setTimeout(() => {
                scrollRef.current?.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior: "smooth",
                });
            }, 50);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                대화
            </h3>

            <div
                ref={scrollRef}
                className="flex max-h-[400px] min-h-[120px] flex-col gap-2 overflow-y-auto"
            >
                {messages.length === 0 && (
                    <p className="py-4 text-center text-xs text-zinc-400">
                        {character.name}에게 말을 걸어보세요
                    </p>
                )}
                {messages.map((msg, i) => (
                    <div
                        key={`${msg.role}-${i}`}
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

            <div className="flex gap-2">
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

export function CharacterDetail({ characterId }: { characterId: number }) {
    const { characters } = useEditorStore();
    const character = characters.find((c) => c.id === characterId);

    if (!character) {
        return (
            <p className="p-4 text-sm text-zinc-500">
                인물을 찾을 수 없습니다.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-zinc-500" />
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {character.name}
                </h3>
            </div>
            {character.description ? (
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {character.description}
                </p>
            ) : (
                <p className="text-sm text-zinc-400">설명이 없습니다.</p>
            )}
            {character.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {character.tags.map((tag) => (
                        <span
                            key={tag}
                            className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            <CharacterChat character={character} />
        </div>
    );
}
