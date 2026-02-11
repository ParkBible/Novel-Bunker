"use client";

import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SceneItem } from "./SceneItem";

interface Scene {
    id?: number;
    title: string;
    chapterId: number;
}

interface Chapter {
    id?: number;
    title: string;
}

interface ChapterItemProps {
    chapter: Chapter;
    scenes: Scene[];
    isExpanded: boolean;
    isCurrentChapter: boolean;
    selectedSceneId: number | null;
    onToggle: () => void;
    onClick: () => void;
    onTitleUpdate: (title: string) => void;
    onDelete: () => void;
    onSceneSelect: (sceneId: number) => void;
    onSceneDelete: (sceneId: number) => void;
}

export function ChapterItem({
    chapter,
    scenes,
    isExpanded,
    isCurrentChapter,
    selectedSceneId,
    onToggle,
    onClick,
    onTitleUpdate,
    onDelete,
    onSceneSelect,
    onSceneDelete,
}: ChapterItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(chapter.title);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        const trimmed = editedTitle.trim();
        if (trimmed && trimmed !== chapter.title) {
            onTitleUpdate(trimmed);
        } else {
            setEditedTitle(chapter.title);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave();
        } else if (e.key === "Escape") {
            setEditedTitle(chapter.title);
            setIsEditing(false);
        }
    };

    const startEditing = () => {
        setEditedTitle(chapter.title);
        setIsEditing(true);
    };

    return (
        <div className="mb-1">
            <div className="group flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <button type="button" onClick={onToggle} className="p-0.5">
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-zinc-500" />
                    )}
                </button>
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className="flex-1 rounded border border-zinc-300 bg-white px-2 py-0.5 text-sm font-medium text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <button
                        type="button"
                        onClick={onClick}
                        onDoubleClick={startEditing}
                        className={`flex flex-1 items-center gap-2 text-left ${
                            isCurrentChapter
                                ? "text-blue-600 dark:text-blue-400"
                                : ""
                        }`}
                    >
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">
                            {chapter.title}
                        </span>
                        {scenes.length > 0 && (
                            <span className="text-xs text-zinc-500">
                                {scenes.length}
                            </span>
                        )}
                    </button>
                )}
                <button
                    type="button"
                    onClick={startEditing}
                    className="rounded p-0.5 opacity-0 transition-opacity hover:bg-zinc-200 group-hover:opacity-100 dark:hover:bg-zinc-700"
                    title="챕터 이름 편집"
                >
                    <Pencil className="h-3.5 w-3.5 text-zinc-500" />
                </button>
                <button
                    type="button"
                    onClick={onDelete}
                    className="rounded p-0.5 opacity-0 transition-opacity hover:bg-zinc-200 group-hover:opacity-100 dark:hover:bg-zinc-700"
                    title="챕터 삭제"
                >
                    <Trash2 className="h-3.5 w-3.5 text-zinc-500 hover:text-red-500" />
                </button>
            </div>

            {isExpanded && (
                <div className="ml-6 mt-0.5">
                    {scenes.map((scene) => (
                        <SceneItem
                            key={scene.id}
                            scene={scene}
                            isSelected={selectedSceneId === scene.id}
                            onSelect={() => scene.id && onSceneSelect(scene.id)}
                            onDelete={() => scene.id && onSceneDelete(scene.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
