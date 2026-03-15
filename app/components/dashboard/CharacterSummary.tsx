"use client";

import { Users } from "lucide-react";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { DashboardCard } from "./DashboardCard";

export function CharacterSummaryContent() {
    const { characters, scenes } = useEditorStore();

    const characterStats = characters.map((char) => {
        const appearsIn = scenes.filter((s) =>
            s.characters.includes(char.name),
        ).length;
        return { ...char, appearsIn };
    });

    return (
        <div className="space-y-3">
            {characterStats.map((char) => (
                <div key={char.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {char.name}
                        </span>
                        <span className="text-xs text-zinc-500">
                            {char.appearsIn}개 씬 등장
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {char.tags.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
            {characterStats.length === 0 && (
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
