"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/app/(shared)/components/ConfirmDialog";
import { ThemeToggle } from "@/app/(shared)/components/ThemeToggle";
import { chapterOps, projectOps } from "@/app/(shared)/db/operations";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { routes } from "@/app/(shared)/routes";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { GeminiKeyCard } from "../dashboard/GeminiKeyCard";
import { WorkCard, type WorkStats } from "./WorkCard";

export function WorksGallery() {
    const t = useTranslation();
    const router = useRouter();
    const {
        projects,
        loadProjects,
        addProject,
        renameProject,
        deleteProject,
        setActiveProject,
    } = useEditorStore();

    const [ready, setReady] = useState(false);
    const [stats, setStats] = useState<Record<number, WorkStats>>({});
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

    // 작품 목록 + 카드 통계 로드
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const list = await loadProjects();
            if (cancelled) return;
            setReady(true);
            const entries = await Promise.all(
                list.map(
                    async (p) =>
                        [p.id!, await projectOps.getStats(p.id!)] as const,
                ),
            );
            if (!cancelled) setStats(Object.fromEntries(entries));
        })();
        return () => {
            cancelled = true;
        };
    }, [loadProjects]);

    const openProject = async (projectId: number) => {
        const chapters = await chapterOps.getAll(projectId);
        let chapterId = chapters[0]?.id;
        if (chapterId === undefined) {
            chapterId = await chapterOps.create(projectId, "1장");
        }
        await setActiveProject(projectId);
        router.push(routes.chapter(chapterId));
    };

    const handleNewWork = async () => {
        const { projectId, firstChapterId } = await addProject(
            t("gallery_newWorkDefault"),
        );
        await setActiveProject(projectId);
        router.push(routes.chapter(firstChapterId));
    };

    const sorted = [...projects].sort((a, b) => a.order - b.order);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        {t("gallery_title")}
                    </h1>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button
                            type="button"
                            onClick={handleNewWork}
                            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                            <Plus className="h-4 w-4" />
                            {t("gallery_newWork")}
                        </button>
                    </div>
                </div>

                {ready && sorted.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-zinc-300 py-16 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                        {t("gallery_empty")}
                    </p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {sorted.map((p) => (
                            <WorkCard
                                key={p.id}
                                project={p}
                                stats={stats[p.id!]}
                                onOpen={() => openProject(p.id!)}
                                onOpenOverview={() =>
                                    router.push(routes.work(p.id!))
                                }
                                onRename={(title) =>
                                    renameProject(p.id!, title)
                                }
                                onDelete={() => setDeleteTarget(p.id!)}
                            />
                        ))}
                        {/* 새 작품 추가 타일 */}
                        <button
                            type="button"
                            onClick={handleNewWork}
                            className="flex min-h-[9rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-600 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
                        >
                            <Plus className="h-6 w-6" />
                            <span className="text-sm">
                                {t("gallery_newWork")}
                            </span>
                        </button>
                    </div>
                )}

                <GeminiKeyCard />
            </div>

            {deleteTarget !== null && (
                <ConfirmDialog
                    message={t("gallery_deleteConfirm")}
                    onConfirm={async () => {
                        const id = deleteTarget;
                        setDeleteTarget(null);
                        await deleteProject(id);
                        setStats((prev) => {
                            const next = { ...prev };
                            delete next[id];
                            return next;
                        });
                    }}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}
