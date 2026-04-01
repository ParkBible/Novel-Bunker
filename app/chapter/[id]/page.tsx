import { ChapterContent } from "./components/ChapterContent";
import { ContextPanel } from "./components/context/ContextPanel";
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
            <div className="w-[clamp(16rem,17vw,20rem)] flex-shrink-0">
                <TreePanel />
            </div>

            <div className="editor-scroll flex-1 overflow-y-auto">
                <ChapterContent chapterId={chapterId} />
            </div>

            <div className="w-[clamp(20rem,21vw,24rem)] flex-shrink-0">
                <ContextPanel />
            </div>
        </div>
    );
}
