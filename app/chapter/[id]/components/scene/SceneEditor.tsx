"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { BubbleMenu, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic } from "lucide-react";
import { useEffect } from "react";

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
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [StarterKit, Placeholder.configure({ placeholder })],
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

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    return (
        <div className="relative">
            {editor && (
                <BubbleMenu
                    editor={editor}
                    tippyOptions={{ duration: 100 }}
                    className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white px-1 py-0.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
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
                </BubbleMenu>
            )}
            <EditorContent editor={editor} />
        </div>
    );
}
