import { WorkOverview } from "./WorkOverview";

interface WorkPageProps {
    params: Promise<{ id: string }>;
}

export default async function WorkPage({ params }: WorkPageProps) {
    const { id } = await params;
    const projectId = Number.parseInt(id, 10);

    if (Number.isNaN(projectId)) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
                <p className="text-zinc-500">잘못된 작품 ID입니다.</p>
            </div>
        );
    }

    return <WorkOverview projectId={projectId} />;
}
