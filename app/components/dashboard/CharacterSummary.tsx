"use client";

import { Users } from "lucide-react";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { DashboardCard } from "./DashboardCard";

export function CharacterSummaryContent() {
    const { characters, setDetailPanel } = useEditorStore();

    return (
        <div className="space-y-2">
            {characters.map((char) => (
                <button
                    type="button"
                    key={char.id}
                    className="w-full cursor-pointer space-y-0.5 rounded-md px-1 py-0.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                    onClick={() =>
                        char.id &&
                        setDetailPanel({
                            type: "character",
                            characterId: char.id,
                        })
                    }
                >
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {char.name}
                    </span>
                    {char.description && (
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {char.description}
                        </p>
                    )}
                </button>
            ))}
            {characters.length === 0 && (
                <p className="text-sm text-zinc-500">
                    아직 등장인물이 없습니다.
                </p>
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
