"use client";

import { List } from "lucide-react";
import Link from "next/link";
import { routes } from "@/app/(shared)/routes";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { DashboardCard } from "./DashboardCard";

export function ChapterProgress() {
    const { chapters, scenes } = useEditorStore();

    const chapterStats = chapters
        .filter((c): c is typeof c & { id: number } => c.id != null)
        .map((chapter) => {
            const chapterScenes = scenes.filter(
                (s) => s.chapterId === chapter.id,
            );
            const charCount = chapterScenes.reduce((sum, scene) => {
                const plainText = scene.content.replace(/<[^>]*>/g, "");
                return sum + plainText.length;
            }, 0);
            return {
                id: chapter.id,
                title: chapter.title,
                sceneCount: chapterScenes.length,
                charCount,
            };
        });

    const maxCharCount = Math.max(...chapterStats.map((c) => c.charCount), 1);

    return (
        <DashboardCard title="챕터별 진행도" icon={List}>
            <div className="space-y-3">
                {chapterStats.map((stat) => (
                    <Link
                        key={stat.id}
                        href={routes.chapter(stat.id)}
                        className="block rounded-md p-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                        <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium text-zinc-900 dark:text-zinc-50">
                                {stat.title}
                            </span>
                            <span className="text-xs text-zinc-500">
                                {stat.sceneCount}개 씬 ·{" "}
                                {stat.charCount.toLocaleString()}자
                            </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <div
                                className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-100"
                                style={{
                                    width: `${(stat.charCount / maxCharCount) * 100}%`,
                                }}
                            />
                        </div>
                    </Link>
                ))}
                {chapterStats.length === 0 && (
                    <p className="text-sm text-zinc-500">
                        아직 챕터가 없습니다.
                    </p>
                )}
            </div>
        </DashboardCard>
    );
}
