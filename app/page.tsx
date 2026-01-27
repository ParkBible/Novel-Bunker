"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { chapterOps } from "./(shared)/db/operations";
import { initializeDemoData } from "./(shared)/utils/demoData";

export default function Home() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const redirectToFirstChapter = async () => {
            await initializeDemoData();
            const chapters = await chapterOps.getAll();

            if (chapters.length > 0 && chapters[0].id) {
                router.replace(`/chapter/${chapters[0].id}`);
            } else {
                // 챕터가 없으면 새로 생성
                const newChapterId = await chapterOps.create("챕터 1");
                if (newChapterId) {
                    router.replace(`/chapter/${newChapterId}`);
                }
            }
            setIsLoading(false);
        };

        redirectToFirstChapter();
    }, [router]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
                <p className="text-zinc-500">로딩 중...</p>
            </div>
        );
    }

    return null;
}
