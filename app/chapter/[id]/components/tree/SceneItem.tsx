"use client";

import { FileText, Trash2 } from "lucide-react";

interface SceneItemProps {
    scene: {
        id?: number;
        title: string;
    };
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
}

export function SceneItem({
    scene,
    isSelected,
    onSelect,
    onDelete,
}: SceneItemProps) {
    return (
        <div
            className={`group flex w-full items-center gap-2 rounded px-2 py-1 text-sm transition-colors ${
                isSelected
                    ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
            }`}
        >
            <button
                type="button"
                onClick={onSelect}
                className="flex flex-1 items-center gap-2 text-left"
            >
                <FileText className="h-3.5 w-3.5" />
                <span className="truncate">{scene.title}</span>
            </button>
            <button
                type="button"
                onClick={onDelete}
                className="rounded p-0.5 opacity-0 transition-opacity hover:bg-zinc-300 group-hover:opacity-100 dark:hover:bg-zinc-700"
                title="씬 삭제"
            >
                <Trash2 className="h-3 w-3 text-zinc-500 hover:text-red-500" />
            </button>
        </div>
    );
}
