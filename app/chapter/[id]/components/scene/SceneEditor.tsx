"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, TextQuote } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SceneEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    onReady?: () => void;
}

export function SceneEditor({
    content,
    onChange,
    placeholder,
    onReady,
}: SceneEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const mouseRef = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const isToolbarActionRef = useRef(false);
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

    const updateBubbleMenu = useCallback(() => {
        if (!editor || !containerRef.current) {
            setBubbleMenu(null);
            return;
        }

        const { from, to } = editor.state.selection;
        if (from === to) {
            setBubbleMenu(null);
            return;
        }

        const containerRect = containerRef.current.getBoundingClientRect();
        const selection = window.getSelection();

        if (selection && selection.rangeCount > 0) {
            // 선택 영역 중앙 위에 표시 (마우스/터치 모두 동작)
            const rect = selection.getRangeAt(0).getBoundingClientRect();
            setBubbleMenu({
                top: rect.top - containerRect.top - 44,
                left: rect.left + rect.width / 2 - containerRect.left - 52,
            });
        } else {
            // 폴백: 마우스 좌표
            setBubbleMenu({
                top: mouseRef.current.y - containerRect.top - 40,
                left: mouseRef.current.x - containerRect.left - 44,
            });
        }
    }, [editor]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        const handleMouseUp = (e: MouseEvent) => {
            if (toolbarRef.current?.contains(e.target as Node)) return;
            requestAnimationFrame(() => updateBubbleMenu());
        };
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [updateBubbleMenu]);

    // 터치 이벤트 지원
    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            if (toolbarRef.current?.contains(e.target as Node)) return;
            setBubbleMenu(null);
        };
        const handleTouchEnd = (e: TouchEvent) => {
            if (toolbarRef.current?.contains(e.target as Node)) return;
            // 선택이 확정되도록 약간의 딜레이 후 메뉴 표시
            setTimeout(() => updateBubbleMenu(), 50);
        };
        document.addEventListener("touchstart", handleTouchStart);
        document.addEventListener("touchend", handleTouchEnd);
        return () => {
            document.removeEventListener("touchstart", handleTouchStart);
            document.removeEventListener("touchend", handleTouchEnd);
        };
    }, [updateBubbleMenu]);

    useEffect(() => {
        if (!editor) return;

        // 키보드 선택(Shift+방향키 등)은 selectionUpdate로 처리
        const handleSelectionUpdate = () => {
            if (isDraggingRef.current) return;
            if (isToolbarActionRef.current) {
                isToolbarActionRef.current = false;
                const { from, to } = editor.state.selection;
                if (from === to) setBubbleMenu(null);
                return;
            }
            updateBubbleMenu();
        };
        const handleMouseDown = (e: MouseEvent) => {
            if (toolbarRef.current?.contains(e.target as Node)) return;
            isDraggingRef.current = true;
            setBubbleMenu(null);
        };
        const handleMouseUp = () => {
            isDraggingRef.current = false;
        };

        editor.on("selectionUpdate", handleSelectionUpdate);
        editor.on("blur", () => setBubbleMenu(null));
        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            editor.off("selectionUpdate", handleSelectionUpdate);
            editor.off("blur", () => setBubbleMenu(null));
            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("mouseup", handleMouseUp);
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
                        e.preventDefault();
                        isToolbarActionRef.current = true;
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
                        title="굵게 (Ctrl+B)"
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
                        title="기울임 (Ctrl+I)"
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
                        title="인용문"
                    >
                        <TextQuote className="h-4 w-4" />
                    </button>
                </div>
            )}
            <EditorContent editor={editor} />
        </div>
    );
}
