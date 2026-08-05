"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, TextQuote } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";

interface SceneEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    onReady?: () => void;
    onFocus?: () => void;
    onBlur?: () => void;
}

export function SceneEditor({
    content,
    onChange,
    placeholder,
    onReady,
    onFocus,
    onBlur,
}: SceneEditorProps) {
    const t = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    // 이벤트 재구독 없이 최신 콜백을 참조하기 위한 ref
    const onFocusRef = useRef(onFocus);
    onFocusRef.current = onFocus;
    const onBlurRef = useRef(onBlur);
    onBlurRef.current = onBlur;
    const [bubbleMenu, setBubbleMenu] = useState<{
        top: number;
        left: number;
    } | null>(null);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({ codeBlock: false, code: false }),
            Placeholder.configure({ placeholder }),
        ],
        content,
        onCreate: () => {
            onReady?.();
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: "prose prose-zinc dark:prose-invert max-w-none focus:outline-none min-h-[200px] p-4",
            },
        },
    });

    // 서식 툴바 표시 여부는 오직 "에디터 포커스 + 비어있지 않은 선택" 상태에서
    // 파생한다. (드래그 여부를 추적하던 ref 상태 머신 제거 → 특정 동작 후 상태가
    // 고착되어 클릭만 해도 툴바가 계속 뜨던 버그를 구조적으로 차단)
    const updateBubbleMenu = useCallback(() => {
        if (!editor || !containerRef.current) {
            setBubbleMenu(null);
            return;
        }

        const { state, view } = editor;
        const { from, to, empty } = state.selection;
        // 포커스 없음(에디터 밖) 또는 빈 선택(클릭·캐럿) → 숨김
        if (!editor.isFocused || empty) {
            setBubbleMenu(null);
            return;
        }
        // 공백만 선택된 경우도 숨김
        if (!state.doc.textBetween(from, to, " ", " ").trim()) {
            setBubbleMenu(null);
            return;
        }

        const containerRect = containerRef.current.getBoundingClientRect();
        // ProseMirror 좌표 API로 선택 영역 시작/끝 위치를 구한다 (window.getSelection 타이밍 의존 제거)
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);
        setBubbleMenu({
            top: Math.min(start.top, end.top) - containerRect.top - 44,
            left: (start.left + end.left) / 2 - containerRect.left - 52,
        });
    }, [editor]);

    useEffect(() => {
        if (!editor) return;

        const handleSelectionUpdate = () => updateBubbleMenu();
        const handleFocusEv = () => onFocusRef.current?.();
        const handleBlurEv = () => {
            setBubbleMenu(null);
            onBlurRef.current?.();
        };

        editor.on("selectionUpdate", handleSelectionUpdate);
        editor.on("focus", handleFocusEv);
        editor.on("blur", handleBlurEv);

        return () => {
            editor.off("selectionUpdate", handleSelectionUpdate);
            editor.off("focus", handleFocusEv);
            editor.off("blur", handleBlurEv);
        };
    }, [editor, updateBubbleMenu]);

    useEffect(() => {
        if (!editor) return;
        if (editor.isFocused) return; // 타이핑 중 외부 content 반영 차단 → 스크롤 버그 방지
        if (content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    return (
        <div ref={containerRef} className="relative">
            {editor && bubbleMenu && (
                <div
                    ref={toolbarRef}
                    role="toolbar"
                    className="absolute z-50 flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white px-1 py-0.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
                    style={{
                        top: bubbleMenu.top,
                        left: bubbleMenu.left,
                    }}
                    onMouseDown={(e) => {
                        // 버튼 클릭 시 에디터가 blur되어 선택이 사라지는 것 방지
                        e.preventDefault();
                    }}
                >
                    <button
                        type="button"
                        onClick={() =>
                            editor.chain().focus().toggleBold().run()
                        }
                        className={`rounded p-1.5 transition-colors ${
                            editor.isActive("bold")
                                ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        }`}
                        title={t("sceneEditor_bold")}
                    >
                        <Bold className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            editor.chain().focus().toggleItalic().run()
                        }
                        className={`rounded p-1.5 transition-colors ${
                            editor.isActive("italic")
                                ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        }`}
                        title={t("sceneEditor_italic")}
                    >
                        <Italic className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            editor.chain().focus().toggleBlockquote().run()
                        }
                        className={`rounded p-1.5 transition-colors ${
                            editor.isActive("blockquote")
                                ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        }`}
                        title={t("sceneEditor_quote")}
                    >
                        <TextQuote className="h-4 w-4" />
                    </button>
                </div>
            )}
            <EditorContent editor={editor} />
        </div>
    );
}
