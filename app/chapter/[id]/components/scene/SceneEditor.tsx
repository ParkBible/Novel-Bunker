"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, MessageSquareText, TextQuote } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { CommentMark } from "@/app/(shared)/tiptap/CommentMark";
import { COMMENT_ATTRIBUTE } from "@/app/(shared)/tiptap/comment";

interface SceneEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    onReady?: () => void;
    onFocus?: () => void;
    onBlur?: () => void;
}

// 주석 팝오버가 겨냥한 본문 구간. 팝오버에 입력하는 동안 에디터가 blur되어
// 선택이 흐트러질 수 있으므로, 열 때 잡아둔 from/to로 되돌려 마크를 적용한다.
interface CommentDraft {
    from: number;
    to: number;
    note: string;
    exists: boolean;
    top: number;
    left: number;
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
    const [commentDraft, setCommentDraft] = useState<CommentDraft | null>(null);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({ codeBlock: false, code: false }),
            Placeholder.configure({ placeholder }),
            CommentMark,
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
            left: (start.left + end.left) / 2 - containerRect.left - 70,
        });
    }, [editor]);

    // 주석 팝오버를 지정한 본문 구간 아래에 연다.
    const openCommentAt = useCallback(
        (from: number, to: number, note: string, exists: boolean) => {
            if (!editor || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const anchor = editor.view.coordsAtPos(from);
            setBubbleMenu(null);
            setCommentDraft({
                from,
                to,
                note,
                exists,
                top: anchor.bottom - containerRect.top + 8,
                left: Math.max(
                    4,
                    Math.min(
                        anchor.left - containerRect.left - 40,
                        containerRect.width - 268,
                    ),
                ),
            });
        },
        [editor],
    );

    // 툴바의 주석 버튼: 선택 구간에 새 주석을 달거나, 이미 주석이 걸린
    // 구간이면 그 주석 전체 범위를 잡아 편집한다.
    const openCommentFromSelection = useCallback(() => {
        if (!editor) return;
        const exists = editor.isActive("comment");
        if (exists) {
            editor.chain().focus().extendMarkRange("comment").run();
        }
        const { from, to } = editor.state.selection;
        openCommentAt(
            from,
            to,
            editor.getAttributes("comment").note ?? "",
            exists,
        );
    }, [editor, openCommentAt]);

    // 주석이 걸린 본문을 클릭하면 바로 편집 팝오버를 연다.
    const handleContainerClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (!editor) return;
            const target = event.target as HTMLElement | null;
            if (!target?.closest(`span[${COMMENT_ATTRIBUTE}]`)) return;

            const hit = editor.view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
            });
            if (!hit) return;

            editor
                .chain()
                .focus()
                .setTextSelection(hit.pos)
                .extendMarkRange("comment")
                .run();
            const { from, to } = editor.state.selection;
            openCommentAt(
                from,
                to,
                editor.getAttributes("comment").note ?? "",
                true,
            );
        },
        [editor, openCommentAt],
    );

    const applyComment = useCallback(
        (note: string) => {
            if (!editor || !commentDraft) return;
            const chain = editor.chain().focus().setTextSelection({
                from: commentDraft.from,
                to: commentDraft.to,
            });
            // 내용을 비워서 저장하면 주석 해제로 취급한다
            if (note.trim()) chain.setMark("comment", { note: note.trim() });
            else chain.unsetMark("comment");
            chain.run();
            setCommentDraft(null);
        },
        [editor, commentDraft],
    );

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
            // 문서가 통째로 갈리면 팝오버가 겨냥한 from/to가 무의미해진다
            setCommentDraft(null);
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    const toolbarButtonClass = (isActive: boolean) =>
        `rounded p-1.5 transition-colors ${
            isActive
                ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        }`;

    return (
        // biome-ignore lint/a11y/noStaticElementInteractions: 주석 span 클릭을 잡는 위임 핸들러—대응되는 키보드 경로는 툴바의 주석 버튼이 담당한다
        // biome-ignore lint/a11y/useKeyWithClickEvents: 위와 같은 이유
        <div
            ref={containerRef}
            className="relative"
            onClick={handleContainerClick}
        >
            {editor && bubbleMenu && !commentDraft && (
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
                        className={toolbarButtonClass(editor.isActive("bold"))}
                        title={t("sceneEditor_bold")}
                    >
                        <Bold className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            editor.chain().focus().toggleItalic().run()
                        }
                        className={toolbarButtonClass(
                            editor.isActive("italic"),
                        )}
                        title={t("sceneEditor_italic")}
                    >
                        <Italic className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            editor.chain().focus().toggleBlockquote().run()
                        }
                        className={toolbarButtonClass(
                            editor.isActive("blockquote"),
                        )}
                        title={t("sceneEditor_quote")}
                    >
                        <TextQuote className="h-4 w-4" />
                    </button>
                    <span className="mx-0.5 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
                    <button
                        type="button"
                        onClick={openCommentFromSelection}
                        className={toolbarButtonClass(
                            editor.isActive("comment"),
                        )}
                        title={t("sceneEditor_comment")}
                    >
                        <MessageSquareText className="h-4 w-4" />
                    </button>
                </div>
            )}

            {editor && commentDraft && (
                <CommentPopover
                    draft={commentDraft}
                    onChange={(note) =>
                        setCommentDraft({ ...commentDraft, note })
                    }
                    onSave={applyComment}
                    onCancel={() => setCommentDraft(null)}
                />
            )}

            <EditorContent editor={editor} />
        </div>
    );
}

function CommentPopover({
    draft,
    onChange,
    onSave,
    onCancel,
}: {
    draft: CommentDraft;
    onChange: (note: string) => void;
    onSave: (note: string) => void;
    onCancel: () => void;
}) {
    const t = useTranslation();
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // 팝오버가 열릴 때 한 번만 포커스한다 (타이핑 중 재선택 방지)
    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    return (
        <div
            className="absolute z-50 w-64 rounded-lg border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
            style={{ top: draft.top, left: draft.left }}
            role="dialog"
            aria-label={t("sceneEditor_comment")}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
                if (e.key === "Escape") {
                    e.preventDefault();
                    onCancel();
                }
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    onSave(draft.note);
                }
            }}
        >
            <textarea
                ref={inputRef}
                value={draft.note}
                onChange={(e) => onChange(e.target.value)}
                rows={3}
                placeholder={t("sceneEditor_commentPlaceholder")}
                className="w-full resize-y rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs leading-relaxed text-zinc-700 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-zinc-500"
            />
            <div className="mt-1.5 flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onSave(draft.note)}
                    className="flex-1 rounded bg-zinc-800 py-1 text-[11px] font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                    {t("sceneEditor_commentSave")}
                </button>
                {draft.exists && (
                    <button
                        type="button"
                        onClick={() => onSave("")}
                        className="rounded px-2 py-1 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                        {t("sceneEditor_commentRemove")}
                    </button>
                )}
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded px-2 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
                >
                    {t("cancel")}
                </button>
            </div>
        </div>
    );
}
