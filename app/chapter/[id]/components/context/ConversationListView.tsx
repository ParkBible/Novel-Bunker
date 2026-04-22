"use client";

import { Plus, Trash2 } from "lucide-react";
import { Fragment } from "react";
import type { AiConversation } from "@/app/(shared)/db";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";

interface Props {
    conversations: AiConversation[];
    activeConvId: number | null;
    onNew: () => void;
    onSelect: (id: number) => void;
    onDelete: (e: React.MouseEvent, id: number) => void;
}

export function ConversationListView({
    conversations,
    activeConvId,
    onNew,
    onSelect,
    onDelete,
}: Props) {
    const t = useTranslation();
    return (
        <div className="flex h-full flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {t("chat_conversationListTitle")}
                </h2>
                <button
                    type="button"
                    onClick={onNew}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                >
                    <Plus className="h-3.5 w-3.5" />
                    {t("chat_newConversation")}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                    <p className="py-8 text-center text-xs text-zinc-400">
                        {t("chat_noConversations")}
                    </p>
                ) : (
                    conversations.map((conv) => (
                        <Fragment key={conv.id}>
                            {/* biome-ignore lint/a11y/useSemanticElements: button 안에 button 중첩 방지 */}
                            <div
                                onClick={() =>
                                    conv.id != null && onSelect(conv.id)
                                }
                                onKeyDown={(e) =>
                                    e.key === "Enter" &&
                                    conv.id != null &&
                                    onSelect(conv.id)
                                }
                                tabIndex={0}
                                role="button"
                                className={`group flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${
                                    activeConvId === conv.id
                                        ? "bg-zinc-50 dark:bg-zinc-800/60"
                                        : ""
                                }`}
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm text-zinc-800 dark:text-zinc-200">
                                        {conv.title}
                                    </p>
                                    <p className="text-xs text-zinc-400">
                                        {new Date(
                                            conv.createdAt,
                                        ).toLocaleDateString("ko-KR")}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) =>
                                        conv.id != null && onDelete(e, conv.id)
                                    }
                                    className="ml-2 shrink-0 rounded p-1 opacity-0 hover:bg-zinc-200 group-hover:opacity-100 dark:hover:bg-zinc-700"
                                >
                                    <Trash2 className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500" />
                                </button>
                            </div>
                        </Fragment>
                    ))
                )}
            </div>
        </div>
    );
}
