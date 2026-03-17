"use client";

import { ChevronDown, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";

function LoreCategoryGroup({
    category,
    isCustom,
}: {
    category: string;
    isCustom: boolean;
}) {
    const { lores, addLore, deleteLore, removeLoreCategory } = useEditorStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");

    const categoryLores = lores.filter((l) => l.category === category);

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
                    {categoryLores.map((lore) => (
                        <div
                            key={lore.id}
                            className="group/item flex items-center justify-between rounded-md px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                        >
                            <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                                {lore.name}
                            </span>
                            <button
                                type="button"
                                className="rounded p-0.5 opacity-0 hover:bg-zinc-200 group-hover/item:opacity-100 dark:hover:bg-zinc-700"
                                onClick={() => lore.id && deleteLore(lore.id)}
                            >
                                <Trash2 className="h-3 w-3 text-zinc-400" />
                            </button>
                        </div>
                    ))}

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
                                placeholder="이름 입력..."
                                className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                                // biome-ignore lint/a11y/noAutofocus: 인라인 입력 UX에 필요
                                autoFocus
                            />
                        </div>
                    )}

                    {categoryLores.length === 0 && !isAdding && (
                        <p className="px-2 text-xs text-zinc-400">
                            항목이 없습니다
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

const DEFAULT_CATEGORIES = ["세계관", "장소", "아이템"];

export function LoreSection() {
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
                        placeholder="카테고리 이름..."
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
                    카테고리 추가
                </button>
            )}
        </div>
    );
}
