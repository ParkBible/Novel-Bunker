"use client";

import { LayoutDashboard, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/app/(shared)/components/ThemeToggle";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { routes } from "@/app/(shared)/routes";

interface NovelTitleHeaderProps {
    title: string;
    onTitleUpdate: (title: string) => void;
    onAddChapter: () => void;
}

export function NovelTitleHeader({
    title,
    onTitleUpdate,
    onAddChapter,
}: NovelTitleHeaderProps) {
    const t = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(title);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setEditedTitle(title);
    }, [title]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        const trimmed = editedTitle.trim();
        if (trimmed && trimmed !== title) {
            onTitleUpdate(trimmed);
        } else {
            setEditedTitle(title);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave();
        } else if (e.key === "Escape") {
            setEditedTitle(title);
            setIsEditing(false);
        }
    };

    return (
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
            <div className="group flex min-w-0 flex-1 items-center gap-1">
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className="w-full rounded border border-zinc-300 bg-white px-2 py-0.5 text-sm font-semibold text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                    />
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="truncate text-left text-sm font-semibold text-zinc-900 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300"
                            title={title}
                        >
                            {title}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-zinc-100 group-hover:opacity-100 dark:hover:bg-zinc-800"
                            title={t("novelTitle_editTitle")}
                        >
                            <Pencil className="h-3 w-3 text-zinc-500" />
                        </button>
                    </>
                )}
            </div>
            <div className="ml-2 flex shrink-0 items-center gap-1">
                <ThemeToggle />
                <Link
                    href={routes.dashboard}
                    className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title={t("novelTitle_dashboard")}
                >
                    <LayoutDashboard className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                </Link>
                <button
                    type="button"
                    onClick={onAddChapter}
                    className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title={t("novelTitle_addChapter")}
                >
                    <Plus className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                </button>
            </div>
        </div>
    );
}
