"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { chapterOps } from "./(shared)/db/operations";
import { routes } from "./(shared)/routes";
import { useEditorStore } from "./(shared)/stores/editorStore";

export default function Home() {
    const router = useRouter();
    const { chapters, isInitialized, loadData } = useEditorStore();

    useEffect(() => {
        if (!isInitialized) {
            loadData();
        }
    }, [isInitialized, loadData]);

    useEffect(() => {
        if (!isInitialized) return;

        const redirect = async () => {
            if (chapters.length > 0 && chapters[0].id) {
                router.replace(routes.chapter(chapters[0].id));
            } else {
                const newChapterId = await chapterOps.create("챕터 1");
                if (newChapterId) {
                    router.replace(routes.chapter(newChapterId));
                }
            }
        };

        redirect();
    }, [isInitialized, chapters, router]);

    return (
        <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
            <p className="text-zinc-500">로딩 중...</p>
        </div>
    );
}
