"use client";

import { Plus } from "lucide-react";

interface AddSceneButtonProps {
    chapterId: number;
    order: number;
    onAdd: (chapterId: number, order: number) => void;
}

export function AddSceneButton({
    chapterId,
    order,
    onAdd,
}: AddSceneButtonProps) {
    return (
        <button
            type="button"
            onClick={() => onAdd(chapterId, order)}
            className="group relative my-1 flex h-6 w-full items-center justify-center"
        >
            <div className="absolute inset-x-4 h-px bg-zinc-200 transition-opacity group-hover:opacity-0 dark:bg-zinc-800" />

            <div className="flex w-full items-center gap-2 px-4 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
                <span className="flex items-center justify-center rounded-full bg-zinc-100 p-1 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    <Plus className="h-3 w-3" />
                </span>
                <div className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
            </div>
        </button>
    );
}
