"use client";

import { useEffect } from "react";
import { useEditorStore } from "./(shared)/stores/editorStore";
import { ChapterProgress } from "./components/dashboard/ChapterProgress";
import { CharacterSummary } from "./components/dashboard/CharacterSummary";
import { DashboardHeader } from "./components/dashboard/DashboardHeader";
import { RelationshipDiagram } from "./components/dashboard/RelationshipDiagram";
import { WorkStatistics } from "./components/dashboard/WorkStatistics";

export default function Home() {
    const { isInitialized, loadData } = useEditorStore();

    useEffect(() => {
        if (!isInitialized) {
            loadData();
        }
    }, [isInitialized, loadData]);

    if (!isInitialized) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
                <p className="text-zinc-500">로딩 중...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
                <DashboardHeader />
                <WorkStatistics />
                <div className="grid gap-6 lg:grid-cols-2">
                    <ChapterProgress />
                    <CharacterSummary />
                </div>
                <RelationshipDiagram />
            </div>
        </div>
    );
}
