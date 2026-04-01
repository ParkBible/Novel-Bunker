"use client";

import { List, Plus, Sparkles } from "lucide-react";

interface Props {
    title: string;
    onShowConversations: () => void;
    onNewConversation: () => void;
}

export function ChatHeader({
    title,
    onShowConversations,
    onNewConversation,
}: Props) {
    return (
        <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
            <button
                type="button"
                onClick={onShowConversations}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                title="대화 목록"
            >
                <List className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {title}
                </span>
            </div>
            <button
                type="button"
                onClick={onNewConversation}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                title="새 대화"
            >
                <Plus className="h-4 w-4" />
            </button>
        </div>
    );
}
