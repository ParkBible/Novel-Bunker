"use client";

import { useState } from "react";
import type { AiConversation, AiMessage } from "@/app/(shared)/db";
import { aiConversationOps, aiMessageOps } from "@/app/(shared)/db/operations";
import {
    type AiModelId,
    apiRoutes,
    DEFAULT_AI_MODEL,
} from "@/app/(shared)/routes";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { AiAuthError, postAi } from "@/app/(shared)/utils/aiClient";
import type { AttachedContext } from "./types";

interface Options {
    activeConvId: number | null;
    setActiveConvId: (id: number) => void;
    setConversations: React.Dispatch<React.SetStateAction<AiConversation[]>>;
    messages: AiMessage[];
    setMessages: React.Dispatch<React.SetStateAction<AiMessage[]>>;
    input: string;
    setInput: (val: string) => void;
    attachedCtxs: AttachedContext[];
    setAttachedCtxs: React.Dispatch<React.SetStateAction<AttachedContext[]>>;
    aiModel?: AiModelId;
}

export function useChat({
    activeConvId,
    setActiveConvId,
    setConversations,
    messages,
    setMessages,
    input,
    setInput,
    attachedCtxs,
    setAttachedCtxs,
    aiModel = DEFAULT_AI_MODEL,
}: Options) {
    const [isLoading, setIsLoading] = useState(false);
    // 401(로그인 필요) 응답을 받으면 true → 패널에 로그인 안내 표시
    const [authRequired, setAuthRequired] = useState(false);
    const activeProjectId = useEditorStore((s) => s.activeProjectId);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading || activeProjectId === null) return;

        let convId = activeConvId;
        if (convId === null) {
            convId = await aiConversationOps.create(activeProjectId, "새 대화");
            const newConv: AiConversation = {
                id: convId,
                projectId: activeProjectId,
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
            const data = await postAi<{ reply: string }>(
                apiRoutes.aiChat,
                {
                    messages: updatedMessages.map((m) => ({
                        role: m.role,
                        text: m.text,
                    })),
                    context: ctxForApi,
                    model: aiModel,
                },
                "응답을 생성하지 못했습니다.",
            );
            setAuthRequired(false);

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
        } catch (error) {
            // 로그인 필요는 대화에 남기지 않고 안내만 띄운다
            if (error instanceof AiAuthError) {
                setAuthRequired(true);
                return;
            }
            const errorText =
                error instanceof Error && error.message
                    ? error.message
                    : "응답을 생성하지 못했습니다.";
            const errorMsgId = await aiMessageOps.create(
                convId,
                "model",
                errorText,
            );
            setMessages((prev) => [
                ...prev,
                {
                    id: errorMsgId,
                    conversationId: convId!,
                    role: "model",
                    text: errorText,
                    createdAt: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        handleSend,
        isLoading,
        authRequired,
        clearAuthRequired: () => setAuthRequired(false),
    };
}
