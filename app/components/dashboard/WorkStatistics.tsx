"use client";

import { BookOpen, FileText, Type, Users } from "lucide-react";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";

function StatCard({
    label,
    value,
    sub,
    icon: Icon,
}: {
    label: string;
    value: number;
    sub?: string;
    icon: React.ComponentType<{ className?: string }>;
}) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {value.toLocaleString()}
            </p>
            {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
        </div>
    );
}

export function WorkStatistics() {
    const { chapters, scenes, characters } = useEditorStore();

    const { withSpaces, withoutSpaces } = scenes.reduce(
        (acc, scene) => {
            const plainText = scene.content.replace(/<[^>]*>/g, "");
            acc.withSpaces += plainText.length;
            acc.withoutSpaces += plainText.replace(/\s/g, "").length;
            return acc;
        },
        { withSpaces: 0, withoutSpaces: 0 },
    );

    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="총 챕터" value={chapters.length} icon={BookOpen} />
            <StatCard label="총 씬" value={scenes.length} icon={FileText} />
            <StatCard
                label="총 글자 수"
                value={withoutSpaces}
                sub={`공백 포함 ${withSpaces.toLocaleString()}자`}
                icon={Type}
            />
            <StatCard label="등장인물" value={characters.length} icon={Users} />
        </div>
    );
}
