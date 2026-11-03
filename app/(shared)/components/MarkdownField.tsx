"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { useDraftValue } from "@/app/(shared)/hooks/useDraftValue";

interface MarkdownFieldProps {
    value: string;
    placeholder: string;
    onChange: (val: string) => void;
    className?: string;
}

/**
 * Jira처럼 입력 즉시 마크다운 서식이 적용되는 필드.
 * `# `·`- `·`1. `·`> `·`**굵게**` 등을 치면 바로 서식으로 바뀌고,
 * 저장은 마크다운 문자열로 한다 — 기존 평문 데이터·AI 프롬프트와 그대로 호환된다.
 */
export function MarkdownField({
    value,
    placeholder,
    onChange,
    className,
}: MarkdownFieldProps) {
    const { draft, handleChange, handleFocus, handleBlur } = useDraftValue(
        value,
        onChange,
    );
    // 에디터가 마지막으로 내보낸(또는 주입받은) 마크다운. draft가 이와 다르면
    // 외부에서 값이 바뀐 것(Drive 동기화·버전 복원 등)이므로 에디터에 반영한다.
    const lastMarkdownRef = useRef(value);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            // 마크다운에 대응 문법이 없는 밑줄은 끄고, 블록 뒤에 자동으로 붙는
            // 빈 문단은 저장값에 `&nbsp;`로 새어 나가므로 끈다
            StarterKit.configure({ underline: false, trailingNode: false }),
            Placeholder.configure({ placeholder }),
            Markdown,
        ],
        content: value,
        contentType: "markdown",
        onUpdate: ({ editor }) => {
            const markdown = editor.getMarkdown();
            lastMarkdownRef.current = markdown;
            handleChange(markdown);
        },
        onFocus: handleFocus,
        onBlur: handleBlur,
        editorProps: {
            attributes: {
                class: `markdown-field ${className ?? ""}`,
            },
        },
    });

    useEffect(() => {
        if (!editor || draft === lastMarkdownRef.current) return;
        lastMarkdownRef.current = draft;
        editor.commands.setContent(draft, {
            contentType: "markdown",
            emitUpdate: false,
        });
    }, [editor, draft]);

    return <EditorContent editor={editor} />;
}
