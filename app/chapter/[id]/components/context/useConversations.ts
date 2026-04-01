"use client";

import { useEffect, useState } from "react";
import type { AiConversation, AiMessage } from "@/app/(shared)/db";
import { aiConversationOps, aiMessageOps } from "@/app/(shared)/db/operations";

export function useConversations() {
    const [conversations, setConversations] = useState<AiConversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<number | null>(null);
    const [messages, setMessages] = useState<AiMessage[]>([]);

    useEffect(() => {
        aiConversationOps.getAll().then((convs) => {
            setConversations(convs);
            if (convs.length > 0) setActiveConvId(convs[0].id!);
        });
    }, []);

    useEffect(() => {
        if (activeConvId !== null) {
            aiMessageOps.getByConversation(activeConvId).then(setMessages);
        }
    }, [activeConvId]);

    const handleNew = async () => {
        const id = await aiConversationOps.create("새 대화");
        const newConv: AiConversation = {
            id,
            title: "새 대화",
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        setConversations((prev) => [newConv, ...prev]);
        setActiveConvId(id);
        setMessages([]);
    };

    const handleSelect = (id: number) => {
        setActiveConvId(id);
    };

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        await aiConversationOps.delete(id);
        const updated = conversations.filter((c) => c.id !== id);
        setConversations(updated);
        if (activeConvId === id) {
            if (updated.length > 0) {
                setActiveConvId(updated[0].id!);
            } else {
                setActiveConvId(null);
                setMessages([]);
            }
        }
    };

    return {
        conversations,
        setConversations,
        activeConvId,
        setActiveConvId,
        messages,
        setMessages,
        handleNew,
        handleSelect,
        handleDelete,
    };
}
