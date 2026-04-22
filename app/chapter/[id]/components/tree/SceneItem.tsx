"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileText, GripVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/app/(shared)/components/ConfirmDialog";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";

interface SceneItemProps {
    scene: {
        id?: number;
        title: string;
        content: string;
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
    const [confirmDelete, setConfirmDelete] = useState(false);
    const t = useTranslation();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: scene.id ?? 0 });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex w-full items-center gap-1 rounded px-1 py-1 text-sm transition-colors ${
                isDragging
                    ? "z-50 opacity-50"
                    : isSelected
                      ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
            }`}
        >
            <button
                type="button"
                className="cursor-grab touch-none rounded p-0.5 opacity-0 transition-opacity hover:bg-zinc-200 group-hover:opacity-100 dark:hover:bg-zinc-700"
                {...attributes}
                {...listeners}
            >
                <GripVertical className="h-3 w-3 text-zinc-400" />
            </button>
            <button
                type="button"
                onClick={onSelect}
                className="flex flex-1 items-center gap-2 text-left"
            >
                <FileText className="h-3.5 w-3.5" />
                <span className="truncate">{scene.title}</span>
                <span className="ml-auto shrink-0 text-xs text-zinc-400 dark:text-zinc-600">
                    {
                        scene.content.replace(/<[^>]*>/g, "").replace(/\s/g, "")
                            .length
                    }
                </span>
            </button>
            <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded p-0.5 opacity-0 transition-opacity hover:bg-zinc-300 group-hover:opacity-100 dark:hover:bg-zinc-700"
                title={t("sceneItem_deleteTitle")}
            >
                <Trash2 className="h-3 w-3 text-zinc-500 hover:text-red-500" />
            </button>
            {confirmDelete && (
                <ConfirmDialog
                    message={t("confirm_deleteScene", { name: scene.title })}
                    onConfirm={onDelete}
                    onCancel={() => setConfirmDelete(false)}
                />
            )}
        </div>
    );
}
