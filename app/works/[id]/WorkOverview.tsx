"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { projectOps } from "@/app/(shared)/db/operations";
import { useDriveAutoUpload } from "@/app/(shared)/hooks/useDriveAutoUpload";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { routes } from "@/app/(shared)/routes";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { ChapterProgress } from "@/app/components/dashboard/ChapterProgress";
import { DashboardHeader } from "@/app/components/dashboard/DashboardHeader";
import { RecentScenes } from "@/app/components/dashboard/RecentScenes";
import { SynopsisCard } from "@/app/components/dashboard/SynopsisCard";
import { WritingActivity } from "@/app/components/dashboard/WritingActivity";

interface WorkOverviewProps {
    projectId: number;
}

export function WorkOverview({ projectId }: WorkOverviewProps) {
    const t = useTranslation();
    const { loadData, activeProjectId, isInitialized } = useEditorStore();
    const [ready, setReady] = useState(false);
    const router = useRouter();

    // 받아 온 데이터에 이 작품이 없으면(다른 기기에서 삭제) 갤러리로 나간다
    const reloadAfterPull = useCallback(async () => {
        if (await projectOps.get(projectId)) await loadData(projectId);
        else router.push(routes.home);
    }, [projectId, loadData, router]);

    // 시놉시스처럼 대시보드에서 고치는 내용도 Drive에 올라가고, 다른 기기 변경은 받아 오도록
    const { syncNow } = useDriveAutoUpload({ reloadAfterPull });
    useEffect(() => {
        syncNow();
    }, [syncNow]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await loadData(projectId);
            if (!cancelled) setReady(true);
        })();
        return () => {
            cancelled = true;
        };
    }, [projectId, loadData]);

    if (!ready || !isInitialized || activeProjectId !== projectId) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
                <p className="text-zinc-500">{t("home_loading")}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
                <Link
                    href={routes.home}
                    className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t("work_backToGallery")}
                </Link>
                <DashboardHeader />
                <SynopsisCard />
                <div className="grid gap-6 lg:grid-cols-2">
                    <RecentScenes />
                    <WritingActivity />
                </div>
                <ChapterProgress />
            </div>
        </div>
    );
}
