"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle({ className }: { className?: string }) {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className={`h-6 w-6 rounded ${className ?? ""}`} />;
    }

    const isDark = resolvedTheme === "dark";

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${className ?? ""}`}
            title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
        >
            {isDark ? (
                <Sun className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            ) : (
                <Moon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            )}
        </button>
    );
}
