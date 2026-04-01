"use client";

import { BookOpen, FileText, SendHorizontal, X } from "lucide-react";
import type { RefObject } from "react";
import type { AttachedContext, MentionItem } from "./types";

interface Props {
    input: string;
    attachedCtxs: AttachedContext[];
    showMention: boolean;
    mentionResults: MentionItem[];
    mentionIdx: number;
    textareaRef: RefObject<HTMLTextAreaElement | null>;
    isLoading: boolean;
    onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onSend: () => void;
    onMentionSelect: (item: MentionItem) => void;
    onRemoveAttachedCtx: (ctx: AttachedContext) => void;
}

export function ChatInput({
    input,
    attachedCtxs,
    showMention,
    mentionResults,
    mentionIdx,
    textareaRef,
    isLoading,
    onInputChange,
    onKeyDown,
    onSend,
    onMentionSelect,
    onRemoveAttachedCtx,
}: Props) {
    return (
        <div className="relative p-3 pt-2">
            {/* @ 멘션 드롭다운 */}
            {showMention && mentionResults.length > 0 && (
                <div className="absolute bottom-full left-3 right-3 z-10 mb-1 max-h-52 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                    {mentionResults.map((item, i) => {
                        const alreadyAttached = attachedCtxs.some(
                            (c) => c.type === item.type && c.id === item.id,
                        );
                        return (
                            <button
                                key={`${item.type}-${item.id}`}
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onMentionSelect(item);
                                }}
                                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                                    i === mentionIdx
                                        ? "bg-zinc-100 dark:bg-zinc-800"
                                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                                } ${alreadyAttached ? "opacity-40" : ""}`}
                            >
                                {item.type === "chapter" ? (
                                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                ) : (
                                    <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                )}
                                <div className="min-w-0">
                                    <p className="truncate text-sm text-zinc-800 dark:text-zinc-200">
                                        {item.title}
                                    </p>
                                    {item.chapterTitle && (
                                        <p className="truncate text-xs text-zinc-400">
                                            {item.chapterTitle}
                                        </p>
                                    )}
                                </div>
                                <span className="ml-auto shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                                    {item.type === "chapter" ? "챕터" : "씬"}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* 첨부된 컨텍스트 태그들 */}
            {attachedCtxs.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {attachedCtxs.map((ctx) => (
                        <div
                            key={`${ctx.type}-${ctx.id}`}
                            className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 pl-2 pr-1 py-0.5 dark:border-zinc-700 dark:bg-zinc-800"
                        >
                            {ctx.type === "chapter" ? (
                                <BookOpen className="h-3 w-3 shrink-0 text-zinc-400" />
                            ) : (
                                <FileText className="h-3 w-3 shrink-0 text-zinc-400" />
                            )}
                            <span className="max-w-[100px] truncate text-xs text-zinc-600 dark:text-zinc-400">
                                {ctx.title}
                            </span>
                            <button
                                type="button"
                                onClick={() => onRemoveAttachedCtx(ctx)}
                                className="rounded-full p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            >
                                <X className="h-2.5 w-2.5 text-zinc-400" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* 입력 행 */}
            <div className="flex gap-2">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={onInputChange}
                    onKeyDown={onKeyDown}
                    placeholder="메시지 입력... (@로 씬·챕터 참조)"
                    rows={1}
                    className="flex-1 resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-zinc-500"
                />
                <button
                    type="button"
                    onClick={onSend}
                    disabled={!input.trim() || isLoading}
                    className="rounded-lg bg-zinc-900 px-2.5 text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-300 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-800"
                >
                    <SendHorizontal className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
