"use client";

import { ScrollText } from "lucide-react";
import { useState } from "react";
import { useDebouncedCallback } from "@/app/(shared)/hooks/useDebouncedCallback";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { DashboardCard } from "./DashboardCard";

export function SynopsisCard() {
    const t = useTranslation();
    const { synopsis, updateSynopsis } = useEditorStore();
    // 입력은 로컬 상태로 받고 저장만 늦춘다 (언마운트 시 대기 중인 저장은 flush)
    const [value, setValue] = useState(synopsis);
    const save = useDebouncedCallback(updateSynopsis, 500);

    return (
        <DashboardCard title={t("synopsis_title")} icon={ScrollText}>
            <textarea
                value={value}
                onChange={(e) => {
                    setValue(e.target.value);
                    save(e.target.value);
                }}
                onBlur={() => save.flush()}
                placeholder={t("synopsis_placeholder")}
                className="field-sizing-content block min-h-24 w-full resize-y bg-transparent text-sm leading-relaxed text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-200 dark:placeholder:text-zinc-500"
            />
        </DashboardCard>
    );
}
