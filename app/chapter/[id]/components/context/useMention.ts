"use client";

import type { RefObject } from "react";
import { useMemo, useState } from "react";
import type { Chapter, Scene } from "@/app/(shared)/db";
import type { AttachedContext, MentionItem } from "./types";

interface Options {
    input: string;
    setInput: (val: string) => void;
    attachedCtxs: AttachedContext[];
    setAttachedCtxs: React.Dispatch<React.SetStateAction<AttachedContext[]>>;
    textareaRef: RefObject<HTMLTextAreaElement | null>;
    chapters: Chapter[];
    scenes: Scene[];
    onSend: () => void;
}

export function useMention({
    input,
    setInput,
    attachedCtxs,
    setAttachedCtxs,
    textareaRef,
    chapters,
    scenes,
    onSend,
}: Options) {
    const [showMention, setShowMention] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionIdx, setMentionIdx] = useState(0);

    const mentionResults = useMemo<MentionItem[]>(() => {
        const q = mentionQuery.toLowerCase();
        const results: MentionItem[] = [];

        for (const c of chapters) {
            if (!q || c.title.toLowerCase().includes(q)) {
                results.push({ type: "chapter", id: c.id!, title: c.title });
            }
        }
        for (const s of scenes) {
            if (!q || s.title.toLowerCase().includes(q)) {
                const chapter = chapters.find((c) => c.id === s.chapterId);
                results.push({
                    type: "scene",
                    id: s.id!,
                    title: s.title,
                    content: s.content,
                    chapterTitle: chapter?.title,
                });
            }
        }

        return results.slice(0, 8);
    }, [mentionQuery, chapters, scenes]);

    const handleMentionSelect = (item: MentionItem) => {
        const atIndex = input.lastIndexOf("@");
        setInput(input.slice(0, atIndex));
        setShowMention(false);
        setMentionQuery("");
        setMentionIdx(0);

        const content =
            item.type === "scene"
                ? (item.content ?? "")
                : scenes
                      .filter((s) => s.chapterId === item.id)
                      .sort((a, b) => a.order - b.order)
                      .map((s) => s.content)
                      .join("\n\n");

        setAttachedCtxs((prev) => {
            if (prev.some((c) => c.type === item.type && c.id === item.id))
                return prev;
            return [
                ...prev,
                { type: item.type, id: item.id, title: item.title, content },
            ];
        });

        textareaRef.current?.focus();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);

        const cursor = e.target.selectionStart ?? val.length;
        const textBefore = val.slice(0, cursor);
        const atMatch = textBefore.match(/@([^\s@]*)$/);

        if (atMatch) {
            setMentionQuery(atMatch[1]);
            setShowMention(true);
            setMentionIdx(0);
        } else {
            setShowMention(false);
            setMentionQuery("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showMention && mentionResults.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionIdx((i) =>
                    Math.min(i + 1, mentionResults.length - 1),
                );
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIdx((i) => Math.max(i - 1, 0));
                return;
            }
            if (e.key === "Enter") {
                e.preventDefault();
                handleMentionSelect(mentionResults[mentionIdx]);
                return;
            }
            if (e.key === "Escape") {
                setShowMention(false);
                return;
            }
        }

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            setShowMention(false);
            onSend();
        }
    };

    return {
        showMention,
        mentionResults,
        mentionIdx,
        handleMentionSelect,
        handleInputChange,
        handleKeyDown,
    };
}
