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
    Users,
    X,
} from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/app/(shared)/components/ConfirmDialog";
import type { Character } from "@/app/(shared)/db";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { DashboardCard } from "./DashboardCard";

const DEFAULT_GROUPS = ["주인공", "조연", "기타"];

function SortableCharacterItem({
    char,
    onSelect,
    onDelete,
}: {
    char: Character;
    onSelect: () => void;
    onDelete: () => void;
}) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: char.id ?? 0 });

    return (
        // biome-ignore lint/a11y/useSemanticElements: 내부에 삭제 버튼 포함으로 button 중첩 불가
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 ${isDragging ? "z-50 opacity-50" : ""}`}
            onClick={onSelect}
            onKeyDown={(e) => e.key === "Enter" && onSelect()}
            role="button"
            tabIndex={0}
        >
            <button
                type="button"
                className="cursor-grab touch-none rounded p-0.5 opacity-0 transition-opacity hover:bg-zinc-200 group-hover:opacity-100 dark:hover:bg-zinc-700"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical className="h-3 w-3 text-zinc-400" />
            </button>
            <div className="min-w-0 flex-1 space-y-0.5">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {char.name}
                </span>
                {char.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {char.tags.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <button
                type="button"
                className="rounded p-0.5 opacity-0 hover:bg-zinc-200 group-hover:opacity-100 dark:hover:bg-zinc-700"
                onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(true);
                }}
            >
                <Trash2 className="h-3 w-3 text-zinc-400" />
            </button>
            {confirmDelete && (
                <ConfirmDialog
                    message={`"${char.name}" 캐릭터를 삭제할까요?`}
                    onConfirm={onDelete}
                    onCancel={() => setConfirmDelete(false)}
                />
            )}
        </div>
    );
}

function CharacterGroupSection({
    group,
    isCustom,
}: {
    group: string;
    isCustom: boolean;
}) {
    const {
        characters,
        addCharacter,
        deleteCharacter,
        reorderCharacters,
        removeCharacterGroup,
        renameCharacterGroup,
        setDetailPanel,
    } = useEditorStore();
    const [isExpanded, setIsExpanded] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState("");

    const groupChars = [...characters]
        .filter((c) => c.group === group)
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
            reorderCharacters(active.id as number, over.id as number);
        }
    };

    const handleAdd = async () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        await addCharacter(trimmed, group);
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

    const handleRenameCommit = async () => {
        const trimmed = renameValue.trim();
        if (trimmed && trimmed !== group) {
            await renameCharacterGroup(group, trimmed);
        }
        setIsRenaming(false);
    };

    return (
        <div>
            <div className="group flex items-center gap-1 rounded-md px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
                <button
                    type="button"
                    className="flex flex-1 items-center gap-1 text-left"
                    onClick={() => !isRenaming && setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    )}
                    {isRenaming ? (
                        <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={handleRenameCommit}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameCommit();
                                if (e.key === "Escape") setIsRenaming(false);
                                e.stopPropagation();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full rounded bg-white px-1 text-sm text-zinc-700 outline-none ring-1 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600"
                            // biome-ignore lint/a11y/noAutofocus: 인라인 편집 UX에 필요
                            autoFocus
                        />
                    ) : (
                        <>
                            {/* biome-ignore lint/a11y/noStaticElementInteractions: span 내 더블클릭은 그룹명 인라인 편집 UX */}
                            <span
                                className="text-sm text-zinc-700 dark:text-zinc-300"
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setRenameValue(group);
                                    setIsRenaming(true);
                                }}
                            >
                                {group}
                            </span>
                            <span className="text-xs text-zinc-400">
                                {groupChars.length}
                            </span>
                        </>
                    )}
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
                    {isCustom && groupChars.length === 0 && (
                        <button
                            type="button"
                            className="rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            onClick={() => removeCharacterGroup(group)}
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
                            items={groupChars.map((c) => c.id ?? 0)}
                            strategy={verticalListSortingStrategy}
                        >
                            {groupChars.map((char) => (
                                <SortableCharacterItem
                                    key={char.id}
                                    char={char}
                                    onSelect={() =>
                                        char.id &&
                                        setDetailPanel({
                                            type: "character",
                                            characterId: char.id,
                                        })
                                    }
                                    onDelete={() =>
                                        char.id && deleteCharacter(char.id)
                                    }
                                />
                            ))}
                        </SortableContext>
                    </DndContext>

                    {groupChars.length === 0 && !isAdding && (
                        <p className="px-2 text-xs text-zinc-400">
                            항목이 없습니다
                        </p>
                    )}

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
                </div>
            )}
        </div>
    );
}

export function CharacterSummaryContent() {
    const { characterGroups, addCharacterGroup } = useEditorStore();
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [newGroup, setNewGroup] = useState("");

    const handleAddGroup = async () => {
        const trimmed = newGroup.trim();
        if (!trimmed || characterGroups.includes(trimmed)) return;
        await addCharacterGroup(trimmed);
        setNewGroup("");
        setIsAddingGroup(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleAddGroup();
        if (e.key === "Escape") {
            setIsAddingGroup(false);
            setNewGroup("");
        }
    };

    return (
        <div className="space-y-0.5">
            {characterGroups.map((group) => (
                <CharacterGroupSection
                    key={group}
                    group={group}
                    isCustom={!DEFAULT_GROUPS.includes(group)}
                />
            ))}

            {isAddingGroup ? (
                <div className="px-2">
                    <input
                        type="text"
                        value={newGroup}
                        onChange={(e) => setNewGroup(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={() => {
                            if (!newGroup.trim()) {
                                setIsAddingGroup(false);
                                setNewGroup("");
                            }
                        }}
                        placeholder="그룹 이름..."
                        className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                        // biome-ignore lint/a11y/noAutofocus: 인라인 입력 UX에 필요
                        autoFocus
                    />
                </div>
            ) : (
                <button
                    type="button"
                    className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-300"
                    onClick={() => setIsAddingGroup(true)}
                >
                    <Plus className="h-3.5 w-3.5" />
                    그룹 추가
                </button>
            )}
        </div>
    );
}

export function CharacterSummary() {
    return (
        <DashboardCard title="등장인물 요약" icon={Users}>
            <CharacterSummaryContent />
        </DashboardCard>
    );
}
