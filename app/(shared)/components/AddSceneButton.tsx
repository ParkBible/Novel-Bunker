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
            className="group my-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-200 py-3 text-sm text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700 dark:border-zinc-800 dark:text-zinc-600 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-400"
        >
            <Plus className="h-4 w-4" />
            <span>씬 추가</span>
        </button>
    );
}
