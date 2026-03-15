import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface DashboardCardProps {
    title: string;
    icon: LucideIcon;
    children: ReactNode;
}

export function DashboardCard({
    title,
    icon: Icon,
    children,
}: DashboardCardProps) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
                <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {title}
                </h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}
