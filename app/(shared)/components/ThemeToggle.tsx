"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";

export function ThemeToggle({ className }: { className?: string }) {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const t = useTranslation();

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
            title={isDark ? t("theme_toLight") : t("theme_toDark")}
        >
            {isDark ? (
                <Sun className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            ) : (
                <Moon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            )}
        </button>
    );
}
