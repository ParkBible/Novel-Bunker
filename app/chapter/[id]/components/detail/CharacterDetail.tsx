"use client";

import { useState } from "react";
import type { Character } from "@/app/(shared)/db";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { CharacterChatTab } from "./CharacterChatTab";
import { CharacterInfoTab } from "./CharacterInfoTab";

type Tab = "info" | "chat";

export function CharacterDetail({ characterId }: { characterId: number }) {
    const { characters, updateCharacter } = useEditorStore();
    const character = characters.find((c) => c.id === characterId);
    const [tab, setTab] = useState<Tab>("info");

    if (!character) {
        return (
            <p className="p-4 text-sm text-zinc-500">
                인물을 찾을 수 없습니다.
            </p>
        );
    }

    const save = (updates: Partial<Character>) => {
        if (!character.id) return;
        updateCharacter(character.id, updates);
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
            {/* 탭 */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-700">
                {(["info", "chat"] as Tab[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={`px-4 py-2 text-sm transition-colors ${
                            tab === t
                                ? "border-b-2 border-zinc-900 font-medium text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        }`}
                    >
                        {t === "info" ? "정보" : "대화"}
                    </button>
                ))}
            </div>

            {/* 탭 콘텐츠 */}
            {tab === "info" ? (
                <CharacterInfoTab
                    character={character}
                    onSave={save}
                    className="flex-1 overflow-y-auto"
                />
            ) : (
                <CharacterChatTab
                    character={{
                        id: character.id!,
                        name: character.name,
                        description: character.description,
                        tags: character.tags,
                    }}
                />
            )}
        </div>
    );
}
