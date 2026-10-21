import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface DashboardCardProps {
    title: string;
    icon: LucideIcon;
    // 제목 줄 오른쪽에 붙는 보조 정보 (합계 등)
    aside?: ReactNode;
    children: ReactNode;
}

export function DashboardCard({
    title,
    icon: Icon,
    aside,
    children,
}: DashboardCardProps) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
                <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {title}
                </h2>
                {aside && (
                    <div className="ml-auto text-xs text-zinc-500">{aside}</div>
                )}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}
