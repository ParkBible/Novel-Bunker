"use client";

import { List, Plus, Sparkles } from "lucide-react";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { GEMINI_MODELS, type GeminiModelId } from "@/app/(shared)/routes";

interface Props {
    title: string;
    geminiModel: GeminiModelId;
    onModelChange: (model: GeminiModelId) => void;
    onShowConversations: () => void;
    onNewConversation: () => void;
}

export function ChatHeader({
    title,
    geminiModel,
    onModelChange,
    onShowConversations,
    onNewConversation,
}: Props) {
    const t = useTranslation();
    return (
        <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
            <button
                type="button"
                onClick={onShowConversations}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                title={t("chat_viewConversations")}
            >
                <List className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {title}
                </span>
            </div>
            <select
                value={geminiModel}
                onChange={(e) => onModelChange(e.target.value as GeminiModelId)}
                className="rounded px-1.5 py-0.5 text-xs bg-zinc-100 text-zinc-600 outline-none cursor-pointer hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                title={t("chat_selectModel")}
            >
                {GEMINI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                        {m.label}
                    </option>
                ))}
            </select>
            <button
                type="button"
                onClick={onNewConversation}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                title={t("chat_newConversation")}
            >
                <Plus className="h-4 w-4" />
            </button>
        </div>
    );
}
