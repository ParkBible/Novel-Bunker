"use client";

import { useState } from "react";
import type { AiConversation, AiMessage } from "@/app/(shared)/db";
import { aiConversationOps, aiMessageOps } from "@/app/(shared)/db/operations";
import { apiRoutes } from "@/app/(shared)/routes";
import type { AttachedContext } from "./types";

interface Options {
    activeConvId: number | null;
    setActiveConvId: (id: number) => void;
    conversations: AiConversation[];
    setConversations: React.Dispatch<React.SetStateAction<AiConversation[]>>;
    messages: AiMessage[];
    setMessages: React.Dispatch<React.SetStateAction<AiMessage[]>>;
    input: string;
    setInput: (val: string) => void;
    attachedCtxs: AttachedContext[];
    setAttachedCtxs: React.Dispatch<React.SetStateAction<AttachedContext[]>>;
}

export function useChat({
    activeConvId,
    setActiveConvId,
    conversations,
    setConversations,
    messages,
    setMessages,
    input,
    setInput,
    attachedCtxs,
    setAttachedCtxs,
}: Options) {
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        let convId = activeConvId;
        if (convId === null) {
            convId = await aiConversationOps.create("새 대화");
            const newConv: AiConversation = {
                id: convId,
                title: "새 대화",
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            setConversations((prev) => [newConv, ...prev]);
            setActiveConvId(convId);
        }

        const combinedCtx =
            attachedCtxs.length > 0
                ? {
                      contextType: attachedCtxs[0].type,
                      contextId: attachedCtxs[0].id,
                      contextTitle: attachedCtxs.map((c) => c.title).join(", "),
                      contextContent: attachedCtxs
                          .map(
                              (c) =>
                                  `[${c.type === "scene" ? "씬" : "챕터"}: ${c.title}]\n${c.content}`,
                          )
                          .join("\n\n---\n\n")
                          .slice(0, 3000),
                  }
                : undefined;

        const userMsgId = await aiMessageOps.create(
            convId,
            "user",
            trimmed,
            combinedCtx,
        );
        const userMsg: AiMessage = {
            id: userMsgId,
            conversationId: convId,
            role: "user",
            text: trimmed,
            ...combinedCtx,
            createdAt: new Date(),
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInput("");

        if (messages.length === 0) {
            const title = trimmed.slice(0, 25);
            await aiConversationOps.updateTitle(convId, title);
            setConversations((prev) =>
                prev.map((c) => (c.id === convId ? { ...c, title } : c)),
            );
        }

        const ctxForApi =
            attachedCtxs.length > 0
                ? {
                      type:
                          attachedCtxs.length === 1
                              ? attachedCtxs[0].type
                              : ("scene" as const),
                      title: attachedCtxs.map((c) => c.title).join(", "),
                      content: attachedCtxs
                          .map(
                              (c) =>
                                  `[${c.type === "scene" ? "씬" : "챕터"}: ${c.title}]\n${c.content}`,
                          )
                          .join("\n\n---\n\n"),
                  }
                : undefined;
        setAttachedCtxs([]);

        setIsLoading(true);
        try {
            const res = await fetch(apiRoutes.aiChat, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: updatedMessages.map((m) => ({
                        role: m.role,
                        text: m.text,
                    })),
                    context: ctxForApi,
                }),
            });
            const data = await res.json();

            const modelMsgId = await aiMessageOps.create(
                convId,
                "model",
                data.reply,
            );
            setMessages((prev) => [
                ...prev,
                {
                    id: modelMsgId,
                    conversationId: convId!,
                    role: "model",
                    text: data.reply,
                    createdAt: new Date(),
                },
            ]);
        } catch {
            const errorMsgId = await aiMessageOps.create(
                convId,
                "model",
                "응답을 생성하지 못했습니다.",
            );
            setMessages((prev) => [
                ...prev,
                {
                    id: errorMsgId,
                    conversationId: convId!,
                    role: "model",
                    text: "응답을 생성하지 못했습니다.",
                    createdAt: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return { handleSend, isLoading };
}
