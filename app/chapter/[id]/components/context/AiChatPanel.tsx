"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { ConversationListView } from "./ConversationListView";
import { MessageList } from "./MessageList";
import type { AttachedContext } from "./types";
import { useChat } from "./useChat";
import { useConversations } from "./useConversations";
import { useMention } from "./useMention";

type ViewMode = "chat" | "conversations";

export function AiChatPanel() {
    const { scenes, chapters, geminiModel, setGeminiModel } = useEditorStore();
    const [viewMode, setViewMode] = useState<ViewMode>("chat");
    const [input, setInput] = useState("");
    const [attachedCtxs, setAttachedCtxs] = useState<AttachedContext[]>([]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const {
        conversations,
        setConversations,
        activeConvId,
        setActiveConvId,
        messages,
        setMessages,
        handleNew,
        handleSelect,
        handleDelete,
    } = useConversations();

    const { handleSend, isLoading } = useChat({
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
        geminiModel,
    });

    const {
        showMention,
        mentionResults,
        mentionIdx,
        handleMentionSelect,
        handleInputChange,
        handleKeyDown,
    } = useMention({
        input,
        setInput,
        attachedCtxs,
        setAttachedCtxs,
        textareaRef,
        chapters,
        scenes,
        onSend: handleSend,
    });

    // biome-ignore lint/correctness/useExhaustiveDependencies: messages.length 변경 시 스크롤 트리거 용도
    useEffect(() => {
        setTimeout(() => {
            scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
            });
        }, 50);
    }, [messages.length]);

    const handleNewConversation = async () => {
        await handleNew();
        setViewMode("chat");
    };

    const handleSelectConversation = (id: number) => {
        handleSelect(id);
        setViewMode("chat");
    };

    const activeConv = conversations.find((c) => c.id === activeConvId);

    if (viewMode === "conversations") {
        return (
            <ConversationListView
                conversations={conversations}
                activeConvId={activeConvId}
                onNew={handleNewConversation}
                onSelect={handleSelectConversation}
                onDelete={handleDelete}
            />
        );
    }

    return (
        <div className="flex h-full flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <ChatHeader
                title={activeConv?.title ?? "AI 채팅"}
                geminiModel={geminiModel}
                onModelChange={setGeminiModel}
                onShowConversations={() => setViewMode("conversations")}
                onNewConversation={handleNewConversation}
            />
            <MessageList
                messages={messages}
                isLoading={isLoading}
                scrollRef={scrollRef}
            />
            <ChatInput
                input={input}
                attachedCtxs={attachedCtxs}
                showMention={showMention}
                mentionResults={mentionResults}
                mentionIdx={mentionIdx}
                textareaRef={textareaRef}
                isLoading={isLoading}
                onInputChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onSend={handleSend}
                onMentionSelect={handleMentionSelect}
                onRemoveAttachedCtx={(ctx) =>
                    setAttachedCtxs((prev) =>
                        prev.filter(
                            (c) => !(c.type === ctx.type && c.id === ctx.id),
                        ),
                    )
                }
            />
        </div>
    );
}
