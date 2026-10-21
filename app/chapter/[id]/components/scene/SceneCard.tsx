"use client";

import { StickyNote, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/app/(shared)/components/ConfirmDialog";
import type { Scene } from "@/app/(shared)/db";
import { sceneOps } from "@/app/(shared)/db/operations";
import { useDraftValue } from "@/app/(shared)/hooks/useDraftValue";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { InlineMemo } from "./InlineMemo";
import { SceneEditor } from "./SceneEditor";

interface SceneCardProps {
    scene: Scene;
    sceneIndex?: number;
    onUpdate: () => void;
    onEditorReady?: () => void;
}

export function SceneCard({
    scene,
    sceneIndex,
    onUpdate,
    onEditorReady,
}: SceneCardProps) {
    const {
        selectedSceneId,
        setSelectedSceneId,
        deleteScene,
        updateSceneMemo,
    } = useEditorStore();
    const isSelected = selectedSceneId === scene.id;
    const hasMemo = Boolean(scene.memo?.trim());
    // 메모가 없는 씬은 메모 칸을 숨기고, "메모 추가"를 눌렀을 때만 연다
    const [memoOpen, setMemoOpen] = useState(hasMemo);
    const [focusMemo, setFocusMemo] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // 동기화 등으로 메모가 밖에서 채워지면 보이게
    useEffect(() => {
        if (hasMemo) setMemoOpen(true);
    }, [hasMemo]);
    const t = useTranslation();

    const {
        draft: title,
        handleChange: handleTitleChange,
        handleFocus: handleTitleFocus,
        handleBlur: handleTitleBlur,
    } = useDraftValue(
        scene.title,
        async (val) => {
            if (scene.id !== undefined) {
                await sceneOps.update(scene.id, { title: val });
                onUpdate();
            }
        },
        500,
    );

    const {
        draft: content,
        handleChange: handleContentChange,
        handleFocus: handleContentFocus,
        handleBlur: handleContentBlur,
    } = useDraftValue(
        scene.content,
        async (val) => {
            if (scene.id !== undefined) {
                await sceneOps.updateContent(scene.id, val);
                onUpdate();
            }
        },
        1000,
    );

    const handleMemoSave = async (memo: string) => {
        if (scene.id !== undefined) await updateSceneMemo(scene.id, memo);
    };

    const handleClick = () => {
        if (scene.id !== undefined) {
            setSelectedSceneId(scene.id);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            handleClick();
        }
    };

    return (
        // biome-ignore lint/a11y/useSemanticElements: 내부에 input/button 포함으로 button 사용 불가
        <div
            id={`scene-${scene.id}`}
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={`w-full cursor-pointer rounded-lg border bg-white transition-all dark:bg-zinc-900 ${
                isSelected
                    ? "border-zinc-400 shadow-md dark:border-zinc-600"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
            }`}
        >
            <div className="group/title flex items-center border-b border-zinc-200 dark:border-zinc-800">
                {sceneIndex && (
                    <span className="shrink-0 pl-4 text-sm font-medium text-zinc-400 dark:text-zinc-500">
                        #{sceneIndex}
                    </span>
                )}
                <input
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    onFocus={handleTitleFocus}
                    onBlur={handleTitleBlur}
                    className="min-w-0 flex-1 bg-transparent px-3 py-3 text-lg font-semibold text-zinc-900 focus:outline-none dark:text-zinc-50"
                    placeholder={t("sceneCard_titlePlaceholder")}
                />
                {!memoOpen && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (scene.id !== undefined)
                                setSelectedSceneId(scene.id);
                            setMemoOpen(true);
                            setFocusMemo(true);
                        }}
                        className={`mr-1 shrink-0 rounded p-1 transition-opacity hover:bg-zinc-100 group-hover/title:opacity-100 dark:hover:bg-zinc-800 ${
                            isSelected ? "opacity-100" : "opacity-0"
                        }`}
                        title={t("sceneCard_addMemo")}
                    >
                        <StickyNote className="h-4 w-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" />
                    </button>
                )}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(true);
                    }}
                    className={`mr-3 shrink-0 rounded p-1 transition-opacity hover:bg-zinc-100 group-hover/title:opacity-100 dark:hover:bg-zinc-800 ${isSelected ? "opacity-100" : "opacity-0 md:opacity-0"}`}
                    title={t("sceneCard_deleteTitle")}
                >
                    <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-500" />
                </button>
                {confirmDelete && (
                    <ConfirmDialog
                        message={t("confirm_deleteScene", {
                            name: scene.title,
                        })}
                        onConfirm={() => {
                            if (scene.id) deleteScene(scene.id);
                        }}
                        onCancel={() => setConfirmDelete(false)}
                    />
                )}
            </div>

            {memoOpen && scene.id !== undefined && (
                <div className="px-3 pt-3">
                    <InlineMemo
                        value={scene.memo || ""}
                        onSave={handleMemoSave}
                        storageKey={`scene:${scene.id}`}
                        label={t("sceneCard_memoTitle")}
                        autoFocus={focusMemo}
                        onBlur={(draft) => {
                            setFocusMemo(false);
                            // 아무것도 안 쓰고 나가면 다시 숨긴다
                            if (!draft.trim()) setMemoOpen(false);
                        }}
                    />
                </div>
            )}

            <div className="min-h-50">
                <SceneEditor
                    content={content}
                    onChange={handleContentChange}
                    placeholder={t("sceneCard_contentPlaceholder")}
                    onReady={onEditorReady}
                    onFocus={handleContentFocus}
                    onBlur={handleContentBlur}
                />
            </div>
        </div>
    );
}
