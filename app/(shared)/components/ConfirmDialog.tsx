"use client";

import { createPortal } from "react-dom";

interface Props {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: Props) {
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <button
                type="button"
                className="absolute inset-0 bg-black/50"
                onClick={onCancel}
                aria-label="취소"
            />
            <div
                role="dialog"
                aria-modal="true"
                className="relative z-10 w-72 rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.key === "Escape" && onCancel()}
            >
                <p className="mb-5 text-sm text-zinc-700 dark:text-zinc-300">
                    {message}
                </p>
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
                    >
                        삭제
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
