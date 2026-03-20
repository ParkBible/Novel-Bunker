import { ChapterContent } from "./components/ChapterContent";
import { DetailPanel } from "./components/detail/DetailPanel";
import { TreePanel } from "./components/tree/TreePanel";

interface ChapterPageProps {
    params: Promise<{ id: string }>;
}

export default async function ChapterPage({ params }: ChapterPageProps) {
    const { id } = await params;
    const chapterId = Number.parseInt(id, 10);

    if (Number.isNaN(chapterId)) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
                <p className="text-zinc-500">잘못된 챕터 ID입니다.</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-zinc-50 dark:bg-black">
            <div className="flex flex-shrink-0">
                <div className="w-64">
                    <TreePanel />
                </div>
                <DetailPanel />
            </div>

            <div className="flex-1 overflow-y-auto">
                <ChapterContent chapterId={chapterId} />
            </div>
        </div>
    );
}
