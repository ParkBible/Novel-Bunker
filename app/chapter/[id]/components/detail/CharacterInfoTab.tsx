"use client";

import { HelpCircle, Lightbulb, X } from "lucide-react";
import { useRef, useState } from "react";
import type { Character } from "@/app/(shared)/db";
import { useDraftValue } from "@/app/(shared)/hooks/useDraftValue";
import {
    type GuideItem,
    LONG_FIELDS,
} from "../../constants/characterGuideData";

const SHORT_FIELDS: { key: keyof Character; label: string }[] = [
    { key: "name", label: "이름" },
    { key: "age", label: "나이" },
    { key: "gender", label: "성별" },
    { key: "role", label: "직업/역할" },
    { key: "mbti", label: "MBTI" },
];

const inlineInputClass =
    "w-full bg-transparent text-sm text-zinc-700 outline-none placeholder:text-zinc-300 hover:bg-zinc-50 focus:bg-zinc-50 rounded px-1 py-0.5 -mx-1 transition-colors dark:text-zinc-300 dark:placeholder:text-zinc-600 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800";

const inlineTextareaClass =
    "w-full resize-none overflow-hidden bg-transparent text-sm leading-relaxed text-zinc-700 outline-none placeholder:text-zinc-300 hover:bg-zinc-50 focus:bg-zinc-50 rounded px-1 py-0.5 -mx-1 transition-colors dark:text-zinc-300 dark:placeholder:text-zinc-600 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800";

function AutoResizeTextarea({
    value,
    placeholder,
    onChange,
    guide,
    guideDescription,
    showGuide,
}: {
    value: string;
    placeholder: string;
    onChange: (val: string) => void;
    guide?: GuideItem[];
    guideDescription: string;
    showGuide?: boolean;
}) {
    const { draft, handleChange: saveDraft } = useDraftValue(value, onChange);
    const ref = useRef<HTMLTextAreaElement>(null);

    const handleChange = (val: string) => {
        saveDraft(val);
        if (ref.current) {
            ref.current.style.height = "auto";
            ref.current.style.height = `${ref.current.scrollHeight}px`;
        }
    };

    return (
        <div className="flex flex-col gap-1">
            {showGuide && guide && (
                <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <div className="mb-2 flex items-center gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            이렇게 작성해보세요!
                        </p>
                    </div>
                    {guideDescription && (
                        <p className="mb-4 text-xs text-zinc-400 dark:text-zinc-500 font-medium italic">
                            "{guideDescription}"
                        </p>
                    )}
                    <div className="space-y-1.5">
                        {guide.map((item) => (
                            <div
                                key={item.label}
                                className="flex gap-2 text-xs"
                            >
                                <span className="w-16 shrink-0 font-medium text-zinc-400 dark:text-zinc-500">
                                    {item.label}
                                </span>
                                <span className="text-zinc-400 dark:text-zinc-500">
                                    {item.example}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <textarea
                ref={ref}
                value={draft}
                rows={3}
                placeholder={placeholder}
                onChange={(e) => handleChange(e.target.value)}
                className={inlineTextareaClass}
            />
        </div>
    );
}

function InlineInput({
    value,
    placeholder,
    onChange,
    className,
}: {
    value: string;
    placeholder: string;
    onChange: (val: string) => void;
    className?: string;
}) {
    const { draft, handleChange } = useDraftValue(value, onChange);

    return (
        <input
            value={draft}
            placeholder={placeholder}
            onChange={(e) => handleChange(e.target.value)}
            className={className ?? inlineInputClass}
        />
    );
}

function TagEditor({
    tags,
    onChange,
}: {
    tags: string[];
    onChange: (tags: string[]) => void;
}) {
    const [input, setInput] = useState("");

    const addTag = () => {
        const trimmed = input.trim();
        if (!trimmed || tags.includes(trimmed)) return;
        onChange([...tags, trimmed]);
        setInput("");
    };

    const removeTag = (tag: string) => {
        onChange(tags.filter((t) => t !== tag));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addTag();
        }
    };

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">태그</span>
            <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                    <span
                        key={tag}
                        className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)}>
                            <X className="h-3 w-3 opacity-50 hover:opacity-100" />
                        </button>
                    </span>
                ))}
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={addTag}
                    placeholder="+ 태그"
                    className="rounded px-1 py-0.5 text-xs text-zinc-500 outline-none placeholder:text-zinc-300 hover:bg-zinc-50 focus:bg-zinc-50 dark:text-zinc-400 dark:placeholder:text-zinc-600 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800"
                />
            </div>
        </div>
    );
}

function LongField({
    fieldKey,
    label,
    description,
    guide,
    character,
    onSave,
}: {
    fieldKey: keyof Character;
    label: string;
    description: string;
    guide: GuideItem[];
    character: Character;
    onSave: (updates: Partial<Character>) => void;
}) {
    const [showGuide, setShowGuide] = useState(false);

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">
                    {label}
                </span>
                <button
                    type="button"
                    onClick={() => setShowGuide((v) => !v)}
                    className={`rounded p-0.5 transition-colors ${showGuide ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-300 hover:text-zinc-400 dark:text-zinc-600 dark:hover:text-zinc-500"}`}
                >
                    <HelpCircle className="h-3.5 w-3.5" />
                </button>
            </div>
            <AutoResizeTextarea
                value={(character[fieldKey] as string) ?? ""}
                placeholder="내용을 입력하세요"
                onChange={(val) => onSave({ [fieldKey]: val })}
                guide={guide}
                guideDescription={description}
                showGuide={showGuide}
            />
        </div>
    );
}

export function CharacterInfoTab({
    character,
    onSave,
    className,
}: {
    character: Character;
    onSave: (updates: Partial<Character>) => void;
    className?: string;
}) {
    return (
        <div className={`space-y-4 overflow-x-hidden ${className ?? ""}`}>
            {/* 단답 필드 */}
            <div className="space-y-1.5">
                {SHORT_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-xs text-zinc-400">
                            {label}
                        </span>
                        <InlineInput
                            value={(character[key] as string) ?? ""}
                            placeholder="—"
                            onChange={(val) => onSave({ [key]: val })}
                        />
                    </div>
                ))}
            </div>

            {/* 태그 */}
            <TagEditor
                tags={character.tags}
                onChange={(tags) => onSave({ tags })}
            />

            {/* 장문 필드 */}
            <div className="space-y-3">
                {LONG_FIELDS.map(({ key, label, description, guide }) => (
                    <LongField
                        key={key}
                        fieldKey={key}
                        label={label}
                        description={description}
                        guide={guide}
                        character={character}
                        onSave={onSave}
                    />
                ))}
            </div>
        </div>
    );
}
