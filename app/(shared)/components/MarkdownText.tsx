"use client";

import Markdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

// 줄바꿈 하나도 그대로 살린다 — AI가 대사·문장을 줄 단위로 나눠 제안하는 경우가 많다
const remarkPlugins = [remarkGfm, remarkBreaks];

const components: Components = {
    a: ({ node: _node, ...props }) => (
        <a {...props} target="_blank" rel="noopener noreferrer" />
    ),
    table: ({ node: _node, ...props }) => (
        <div className="overflow-x-auto">
            <table {...props} />
        </div>
    ),
};

export function MarkdownText({
    text,
    className,
}: {
    text: string;
    className?: string;
}) {
    return (
        <div className={`markdown-field break-words ${className ?? ""}`}>
            <Markdown remarkPlugins={remarkPlugins} components={components}>
                {text}
            </Markdown>
        </div>
    );
}
