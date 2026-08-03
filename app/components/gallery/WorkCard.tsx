"use client";

import { BookText, MoreVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/app/(shared)/db";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";

export interface WorkStats {
    chapters: number;
    scenes: number;
    chars: number;
}

interface WorkCardProps {
    project: Project;
    stats?: WorkStats;
    onOpen: () => void;
    onOpenOverview: () => void;
    onRename: (title: string) => void;
    onDelete: () => void;
}

export function WorkCard({
    project,
    stats,
    onOpen,
    onOpenOverview,
    onRename,
    onDelete,
}: WorkCardProps) {
    const t = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(project.title);
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const onDocClick = (e: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [menuOpen]);

    useEffect(() => {
        if (isEditing) inputRef.current?.select();
    }, [isEditing]);

    const title = project.title || t("gallery_untitled");

    const saveRename = () => {
        const trimmed = draft.trim();
        if (trimmed && trimmed !== project.title) onRename(trimmed);
        else setDraft(project.title);
        setIsEditing(false);
    };

    return (
        <div className="group relative flex flex-col rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            {/* ⋯ 메뉴 */}
            <div ref={menuRef} className="absolute right-3 top-3">
                <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="rounded p-1 text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 group-hover:opacity-100 dark:hover:bg-zinc-800"
                    aria-label={t("settings")}
                >
                    <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpen && (
                    <div className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                        <button
                            type="button"
                            onClick={() => {
                                setMenuOpen(false);
                                onOpenOverview();
                            }}
                            className="block w-full px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            {t("gallery_openOverview")}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setMenuOpen(false);
                                setDraft(project.title);
                                setIsEditing(true);
                            }}
                            className="block w-full px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            {t("gallery_rename")}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setMenuOpen(false);
                                onDelete();
                            }}
                            className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                            {t("delete")}
                        </button>
                    </div>
                )}
            </div>

            <BookText className="mb-3 h-6 w-6 text-zinc-400" />

            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={saveRename}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename();
                        else if (e.key === "Escape") {
                            setDraft(project.title);
                            setIsEditing(false);
                        }
                    }}
                    className="mb-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-base font-semibold text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                />
            ) : (
                <button
                    type="button"
                    onClick={onOpen}
                    className="mb-1 truncate text-left text-base font-semibold text-zinc-900 hover:text-blue-600 dark:text-zinc-50 dark:hover:text-blue-400"
                    title={title}
                >
                    {title}
                </button>
            )}

            <button
                type="button"
                onClick={onOpen}
                className="mt-auto pt-3 text-left text-xs text-zinc-500 dark:text-zinc-400"
            >
                {stats
                    ? `${stats.chapters} ${t("gallery_chapterUnit")} · ${stats.scenes} ${t("gallery_sceneUnit")} · ${stats.chars.toLocaleString()}자`
                    : " "}
            </button>
        </div>
    );
}
