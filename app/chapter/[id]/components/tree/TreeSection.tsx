import type { ReactNode } from "react";

interface TreeSectionProps {
    title: string;
    children: ReactNode;
    className?: string;
}

export function TreeSection({ title, children, className }: TreeSectionProps) {
    return (
        <div className={className}>
            <h3 className="border-y border-zinc-200 bg-zinc-100 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400">
                {title}
            </h3>
            {children}
        </div>
    );
}
