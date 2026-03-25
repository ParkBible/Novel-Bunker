"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SceneEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

export function SceneEditor({
    content,
    onChange,
    placeholder,
}: SceneEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mouseRef = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const [bubbleMenu, setBubbleMenu] = useState<{
        top: number;
        left: number;
    } | null>(null);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: placeholder || "여기에 씬을 작성하세요...",
            }),
        ],
        content,
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

        setBubbleMenu({
            top: mouseRef.current.y - containerRect.top - 40,
            left: mouseRef.current.x - containerRect.left - 44,
        });
    }, [editor]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        const handleMouseUp = () => {
            // 드래그 끝난 뒤 메뉴 표시
            requestAnimationFrame(() => updateBubbleMenu());
        };
        el.addEventListener("mousemove", handleMouseMove);
        el.addEventListener("mouseup", handleMouseUp);
        return () => {
            el.removeEventListener("mousemove", handleMouseMove);
            el.removeEventListener("mouseup", handleMouseUp);
        };
    }, [updateBubbleMenu]);

    useEffect(() => {
        if (!editor) return;

        // 키보드 선택(Shift+방향키 등)은 selectionUpdate로 처리
        const handleSelectionUpdate = () => {
            // 마우스 버튼이 눌린 상태(드래그 중)면 무시
            if (isDraggingRef.current) return;
            updateBubbleMenu();
        };
        const handleMouseDown = () => {
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
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    return (
        <div ref={containerRef} className="relative">
            {editor && bubbleMenu && (
                <div
                    role="toolbar"
                    className="absolute z-50 flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white px-1 py-0.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
                    style={{
                        top: bubbleMenu.top,
                        left: bubbleMenu.left,
                    }}
                    onMouseDown={(e) => e.preventDefault()}
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
                </div>
            )}
            <EditorContent editor={editor} />
        </div>
    );
}
