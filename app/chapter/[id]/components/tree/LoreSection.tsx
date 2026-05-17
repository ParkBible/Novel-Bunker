"use client";

import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    ChevronDown,
    ChevronRight,
    GripVertical,
    Plus,
    Trash2,
    X,
} from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/app/(shared)/components/ConfirmDialog";
import type { Lore } from "@/app/(shared)/db";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";

interface SortableLoreItemProps {
    lore: Lore;
    onOpen: () => void;
    onDelete: (e: React.MouseEvent) => void;
}

function SortableLoreItem({ lore, onOpen, onDelete }: SortableLoreItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: lore.id! });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        // biome-ignore lint/a11y/useSemanticElements: 내부에 삭제 버튼 포함으로 button 중첩 불가
        <div
            ref={setNodeRef}
            style={style}
            className="group/item flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
            onClick={onOpen}
            onKeyDown={(e) => {
                if (e.key === "Enter") onOpen();
            }}
            role="button"
            tabIndex={0}
        >
            <button
                type="button"
                className="shrink-0 cursor-grab touch-none opacity-0 group-hover/item:opacity-100 active:cursor-grabbing"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical className="h-3 w-3 text-zinc-400" />
            </button>
            <span className="flex-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                {lore.name}
            </span>
            <button
                type="button"
                className="shrink-0 rounded p-0.5 opacity-0 hover:bg-zinc-200 group-hover/item:opacity-100 dark:hover:bg-zinc-700"
                onClick={onDelete}
            >
                <Trash2 className="h-3 w-3 text-zinc-400" />
            </button>
        </div>
    );
}

function LoreCategoryGroup({
    category,
    isCustom,
}: {
    category: string;
    isCustom: boolean;
}) {
    const t = useTranslation();
    const {
        lores,
        addLore,
        deleteLore,
        removeLoreCategory,
        setDetailPanel,
        reorderLores,
    } = useEditorStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    const categoryLores = lores
        .filter((l) => l.category === category)
        .sort((a, b) => a.order - b.order);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            reorderLores(category, active.id as number, over.id as number);
        }
    };

    const handleAdd = async () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        await addLore(trimmed, category);
        setNewName("");
        setIsAdding(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleAdd();
        if (e.key === "Escape") {
            setIsAdding(false);
            setNewName("");
        }
    };

    const handleRemoveCategory = async () => {
        if (categoryLores.length > 0) return;
        await removeLoreCategory(category);
    };

    return (
        <div>
            <div className="group flex items-center gap-1 rounded-md px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
                <button
                    type="button"
                    className="flex flex-1 items-center gap-1 text-left"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                    )}
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {category}
                    </span>
                    <span className="text-xs text-zinc-400">
                        {categoryLores.length}
                    </span>
                </button>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                    <button
                        type="button"
                        className="rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        onClick={() => {
                            setIsExpanded(true);
                            setIsAdding(true);
                        }}
                    >
                        <Plus className="h-3.5 w-3.5 text-zinc-500" />
                    </button>
                    {isCustom && categoryLores.length === 0 && (
                        <button
                            type="button"
                            className="rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            onClick={handleRemoveCategory}
                        >
                            <X className="h-3.5 w-3.5 text-zinc-500" />
                        </button>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="ml-3 space-y-0.5 py-0.5">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={categoryLores.map((l) => l.id!)}
                            strategy={verticalListSortingStrategy}
                        >
                            {categoryLores.map((lore) => (
                                <SortableLoreItem
                                    key={lore.id}
                                    lore={lore}
                                    onOpen={() =>
                                        lore.id &&
                                        setDetailPanel({
                                            type: "lore",
                                            loreId: lore.id,
                                        })
                                    }
                                    onDelete={(e) => {
                                        e.stopPropagation();
                                        if (lore.id)
                                            setConfirmDeleteId(lore.id);
                                    }}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>

                    {confirmDeleteId !== null &&
                        (() => {
                            const lore = categoryLores.find(
                                (l) => l.id === confirmDeleteId,
                            );
                            return lore ? (
                                <ConfirmDialog
                                    message={t("confirm_deleteLore", {
                                        name: lore.name,
                                    })}
                                    onConfirm={() => {
                                        deleteLore(confirmDeleteId);
                                        setConfirmDeleteId(null);
                                    }}
                                    onCancel={() => setConfirmDeleteId(null)}
                                />
                            ) : null;
                        })()}

                    {isAdding && (
                        <div className="px-2">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={() => {
                                    if (!newName.trim()) {
                                        setIsAdding(false);
                                        setNewName("");
                                    }
                                }}
                                placeholder={t("loreSection_namePlaceholder")}
                                className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                                // biome-ignore lint/a11y/noAutofocus: 인라인 입력 UX에 필요
                                autoFocus
                            />
                        </div>
                    )}

                    {categoryLores.length === 0 && !isAdding && (
                        <p className="px-2 text-xs text-zinc-400">
                            {t("loreSection_empty")}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

const DEFAULT_CATEGORIES = ["세계관", "장소", "아이템"];

export function LoreSection() {
    const t = useTranslation();
    const { loreCategories, addLoreCategory } = useEditorStore();
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategory, setNewCategory] = useState("");

    const handleAddCategory = async () => {
        const trimmed = newCategory.trim();
        if (!trimmed || loreCategories.includes(trimmed)) return;
        await addLoreCategory(trimmed);
        setNewCategory("");
        setIsAddingCategory(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleAddCategory();
        if (e.key === "Escape") {
            setIsAddingCategory(false);
            setNewCategory("");
        }
    };

    return (
        <div className="space-y-0.5">
            {loreCategories.map((category) => (
                <LoreCategoryGroup
                    key={category}
                    category={category}
                    isCustom={!DEFAULT_CATEGORIES.includes(category)}
                />
            ))}

            {isAddingCategory ? (
                <div className="px-2">
                    <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={() => {
                            if (!newCategory.trim()) {
                                setIsAddingCategory(false);
                                setNewCategory("");
                            }
                        }}
                        placeholder={t("loreSection_categoryPlaceholder")}
                        className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                        // biome-ignore lint/a11y/noAutofocus: 인라인 입력 UX에 필요
                        autoFocus
                    />
                </div>
            ) : (
                <button
                    type="button"
                    className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-300"
                    onClick={() => setIsAddingCategory(true)}
                >
                    <Plus className="h-3.5 w-3.5" />
                    {t("loreSection_addCategory")}
                </button>
            )}
        </div>
    );
}
