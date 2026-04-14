import type { ReactNode } from "react";

interface TreeSectionProps {
    title: string;
    children: ReactNode;
    className?: string;
}

export function TreeSection({ title, children, className }: TreeSectionProps) {
    return (
        <div className={className}>
            <h3 className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {title}
            </h3>
            {children}
        </div>
    );
}
