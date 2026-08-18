"use client";

import { Braces, Check, FileCode, FileText, Hash, Printer } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import type { TranslationKey } from "@/app/(shared)/i18n/translations";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import {
    type ExportFormat,
    exportManuscript,
    getManuscriptStats,
    isManuscriptEmpty,
    type ManuscriptSource,
    type SceneHeadingMode,
} from "@/app/(shared)/utils/export";

interface ExportModalProps {
    onClose: () => void;
}

interface FormatOption {
    id: ExportFormat;
    icon: typeof FileText;
    labelKey: TranslationKey;
    descKey: TranslationKey;
}

const FORMATS: FormatOption[] = [
    {
        id: "txt",
        icon: FileText,
        labelKey: "export_txt",
        descKey: "export_txtDesc",
    },
    {
        id: "markdown",
        icon: Hash,
        labelKey: "export_markdown",
        descKey: "export_markdownDesc",
    },
    {
        id: "html",
        icon: FileCode,
        labelKey: "export_html",
        descKey: "export_htmlDesc",
    },
    {
        id: "pdf",
        icon: Printer,
        labelKey: "export_pdf",
        descKey: "export_pdfDesc",
    },
    {
        id: "json",
        icon: Braces,
        labelKey: "export_json",
        descKey: "export_jsonDesc",
    },
];

const SCENE_HEADINGS: { id: SceneHeadingMode; labelKey: TranslationKey }[] = [
    { id: "title", labelKey: "export_sceneHeadingTitle" },
    { id: "number", labelKey: "export_sceneHeadingNumber" },
    { id: "none", labelKey: "export_sceneHeadingNone" },
];

export function ExportModal({ onClose }: ExportModalProps) {
    const t = useTranslation();
    const novelTitle = useEditorStore((s) => s.novelTitle);
    const chapters = useEditorStore((s) => s.chapters);
    const scenes = useEditorStore((s) => s.scenes);

    const [format, setFormat] = useState<ExportFormat>("txt");
    const [sceneHeading, setSceneHeading] = useState<SceneHeadingMode>("title");
    const [isExporting, setIsExporting] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const source: ManuscriptSource = { title: novelTitle, chapters, scenes };
    const stats = getManuscriptStats(source);
    const isEmpty = isManuscriptEmpty(source);
    const isBackup = format === "json";
    const isPrint = format === "pdf";
    // 백업(JSON)은 본문과 무관하게 항상 내보낼 수 있다
    const isBlocked = isEmpty && !isBackup;

    const handleExport = async () => {
        setIsExporting(true);
        setError(null);
        try {
            await exportManuscript(format, source, { sceneHeading });
            setIsDone(true);
            // 인쇄는 대화상자가 뜨는 동안 모달을 남겨 둔다
            if (!isPrint) setTimeout(onClose, 600);
        } catch (e) {
            setError(e instanceof Error ? e.message : t("export_error"));
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
                aria-label={t("export_closeLabel")}
            />
            <div className="relative z-10 flex w-full max-w-sm flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                <h2 className="mb-0.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    {t("export_title")}
                </h2>
                <p className="mb-3 text-xs text-zinc-400 dark:text-zinc-500">
                    {t("export_summary", {
                        chapters: stats.chapters,
                        scenes: stats.scenes,
                        chars: stats.chars.toLocaleString(),
                    })}
                </p>

                <div className="flex flex-col gap-1">
                    {FORMATS.map((option) => {
                        const Icon = option.icon;
                        const isSelected = format === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => {
                                    setFormat(option.id);
                                    setIsDone(false);
                                    setError(null);
                                }}
                                className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                                    isSelected
                                        ? "border-zinc-800 bg-zinc-50 dark:border-zinc-300 dark:bg-zinc-800"
                                        : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                }`}
                            >
                                <Icon
                                    className={`mt-0.5 size-3.5 shrink-0 ${
                                        isSelected
                                            ? "text-zinc-800 dark:text-zinc-100"
                                            : "text-zinc-400"
                                    }`}
                                />
                                <span className="min-w-0">
                                    <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-200">
                                        {t(option.labelKey)}
                                    </span>
                                    <span className="mt-0.5 block text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                                        {t(option.descKey)}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>

                {!isBackup && (
                    <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">
                            {t("export_sceneHeadingLabel")}
                        </span>
                        <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
                            {SCENE_HEADINGS.map((option) => {
                                const isSelected = sceneHeading === option.id;
                                return (
                                    <label
                                        key={option.id}
                                        className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                            isSelected
                                                ? "bg-white text-zinc-800 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                                                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="export-scene-heading"
                                            className="sr-only"
                                            checked={isSelected}
                                            onChange={() => {
                                                setSceneHeading(option.id);
                                                setIsDone(false);
                                                setError(null);
                                            }}
                                        />
                                        {t(option.labelKey)}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                {isBlocked && (
                    <p className="mt-3 text-xs text-amber-500">
                        {t("export_emptyWarning")}
                    </p>
                )}
                {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
                {isDone && !error && (
                    <p className="mt-3 flex items-center gap-1 text-xs text-emerald-500">
                        <Check className="size-3.5" />
                        {t("export_done")}
                    </p>
                )}

                <div className="mt-4 flex gap-2">
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={isExporting || isBlocked}
                        className="flex-1 rounded-lg bg-zinc-800 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                    >
                        {isExporting
                            ? t("export_running")
                            : isPrint
                              ? t("export_print")
                              : t("export_run")}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-lg bg-zinc-100 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                        {t("close")}
                    </button>
                </div>
            </div>
        </div>
    );
}
