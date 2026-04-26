"use client";

import { ExternalLink, X } from "lucide-react";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import type { TranslationKey } from "@/app/(shared)/i18n/translations";

interface Step {
    title: string;
    desc: string;
    link?: { label: string; href: string };
    highlights?: string[];
}

type TFunction = (
    key: TranslationKey,
    params?: Record<string, string | number>,
) => string;

function getSteps(origin: string, t: TFunction): Step[] {
    return [
        {
            title: t("guide_step1Title"),
            desc: t("guide_step1Desc"),
            link: {
                label: t("guide_step1Link"),
                href: "https://console.cloud.google.com/",
            },
        },
        {
            title: t("guide_step2Title"),
            desc: t("guide_step2Desc"),
            link: {
                label: t("guide_step2Link"),
                href: "https://console.cloud.google.com/apis/library/drive.googleapis.com",
            },
        },
        {
            title: t("guide_step3Title"),
            desc: t("guide_step3Desc"),
            link: {
                label: t("guide_step3Link"),
                href: "https://console.cloud.google.com/apis/credentials/consent",
            },
            highlights: [t("guide_step3Warning")],
        },
        {
            title: t("guide_step4Title"),
            desc: t("guide_step4Desc"),
            link: {
                label: t("guide_step4Link"),
                href: "https://console.cloud.google.com/apis/credentials",
            },
            highlights: [origin, `${origin}/auth`],
        },
        {
            title: t("guide_step5Title"),
            desc: t("guide_step5Desc"),
        },
    ];
}

interface Props {
    onClose: () => void;
}

export function ClientIdGuideModal({ onClose }: Props) {
    const t = useTranslation();
    const steps = getSteps(window.location.origin, t);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
                aria-label={t("guide_closeLabel")}
            />
            <div className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                {/* 헤더 */}
                <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            {t("guide_title")}
                        </h2>
                        <p className="mt-0.5 text-xs text-zinc-400">
                            {t("guide_subtitle")}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* 단계 목록 */}
                <ol className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
                    {steps.map((step, i) => (
                        <li key={step.title} className="flex gap-3">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                {i + 1}
                            </span>
                            <div className="flex flex-col gap-1">
                                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                                    {step.title}
                                </p>
                                <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                    {step.desc}
                                </p>
                                {step.highlights?.map((h) => (
                                    <code
                                        key={h}
                                        className="w-fit rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                                    >
                                        {h}
                                    </code>
                                ))}
                                {step.link && (
                                    <a
                                        href={step.link.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex w-fit items-center gap-1 text-xs text-blue-500 hover:underline dark:text-blue-400"
                                    >
                                        {step.link.label}
                                        <ExternalLink className="size-3" />
                                    </a>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>

                {/* 푸터 */}
                <div className="border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-lg bg-zinc-100 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                        {t("close")}
                    </button>
                </div>
            </div>
        </div>
    );
}
