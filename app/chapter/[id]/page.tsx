import { ChapterView } from "@/app/(shared)/components/ChapterView";

interface ChapterPageProps {
    params: { id: string };
}

export default async function ChapterPage({ params }: ChapterPageProps) {
    const { id } = params;
    const chapterId = Number.parseInt(id, 10);

    if (Number.isNaN(chapterId)) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
                <p className="text-zinc-500">잘못된 챕터 ID입니다.</p>
            </div>
        );
    }

    return <ChapterView chapterId={chapterId} />;
}
