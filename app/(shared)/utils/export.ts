import type { Chapter, Scene } from "../db";
import { collectLocalData } from "../db/backup";

// 씬 본문은 TipTap이 만든 HTML 문자열이다. 내보내기 형식마다 이 HTML을
// 텍스트/마크다운으로 변환하거나(=아래 렌더러), 스타일을 입혀 그대로 감싼다.

export type ExportFormat = "txt" | "markdown" | "html" | "pdf" | "json";

export interface ExportOptions {
    includeSceneTitles: boolean;
}

export interface ManuscriptSource {
    title: string;
    chapters: Chapter[];
    scenes: Scene[];
}

interface OrderedChapter {
    title: string;
    scenes: Scene[];
}

// ── HTML → 텍스트/마크다운 변환 ─────────────────────────────

type RenderMode = "text" | "markdown";

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

function parseBody(html: string): HTMLElement {
    return new DOMParser().parseFromString(html || "", "text/html").body;
}

// 인라인 서식(굵게/기울임/취소선/링크/줄바꿈)만 처리한다.
function renderInline(node: Node, mode: RenderMode): string {
    if (node.nodeType === TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== ELEMENT_NODE) return "";

    const el = node as Element;
    if (el.tagName === "BR") return mode === "markdown" ? "  \n" : "\n";

    const inner = Array.from(el.childNodes)
        .map((child) => renderInline(child, mode))
        .join("");
    if (mode === "text" || !inner.trim()) return inner;

    switch (el.tagName) {
        case "STRONG":
        case "B":
            return `**${inner}**`;
        case "EM":
        case "I":
            return `*${inner}*`;
        case "S":
        case "DEL":
        case "STRIKE":
            return `~~${inner}~~`;
        case "CODE":
            return `\`${inner}\``;
        case "A": {
            const href = el.getAttribute("href");
            return href ? `[${inner}](${href})` : inner;
        }
        default:
            return inner;
    }
}

// 블록 단위 문자열 배열을 반환한다. 호출부에서 "\n\n"으로 이어 붙인다.
function renderBlocks(
    parent: ParentNode,
    mode: RenderMode,
    depth: number,
): string[] {
    const out: string[] = [];

    for (const node of Array.from(parent.childNodes)) {
        if (node.nodeType === TEXT_NODE) {
            const text = (node.textContent ?? "").trim();
            if (text) out.push(text);
            continue;
        }
        if (node.nodeType !== ELEMENT_NODE) continue;

        const el = node as Element;
        const tag = el.tagName;

        // 씬 안의 제목은 문서 계층(작품 > 챕터 > 씬) 아래로 3단계 밀어 넣는다
        if (/^H[1-6]$/.test(tag)) {
            const text = renderInline(el, mode).trim();
            if (!text) continue;
            const level = Math.min(6, Number(tag[1]) + 3);
            out.push(
                mode === "markdown" ? `${"#".repeat(level)} ${text}` : text,
            );
            continue;
        }

        switch (tag) {
            case "P": {
                const text = renderInline(el, mode).trimEnd();
                if (text.trim()) out.push(text);
                break;
            }
            case "BLOCKQUOTE": {
                const inner = renderBlocks(el, mode, depth);
                if (inner.length === 0) break;
                out.push(
                    mode === "markdown"
                        ? inner
                              .map((block) =>
                                  block
                                      .split("\n")
                                      .map((line) => `> ${line}`)
                                      .join("\n"),
                              )
                              .join("\n>\n")
                        : inner.join("\n\n"),
                );
                break;
            }
            case "UL":
            case "OL": {
                const items: string[] = [];
                let index = 1;
                for (const li of Array.from(el.children)) {
                    if (li.tagName !== "LI") continue;
                    const blocks = renderBlocks(li, mode, depth + 1);
                    if (blocks.length === 0) continue;

                    const marker =
                        tag === "OL"
                            ? `${index}. `
                            : mode === "markdown"
                              ? "- "
                              : "· ";
                    const indent = "    ".repeat(depth);
                    const [first, ...rest] = blocks.join("\n").split("\n");
                    items.push(
                        [
                            `${indent}${marker}${first}`,
                            ...rest.map(
                                (line) =>
                                    `${indent}${" ".repeat(marker.length)}${line}`,
                            ),
                        ].join("\n"),
                    );
                    index++;
                }
                if (items.length > 0) out.push(items.join("\n"));
                break;
            }
            case "HR":
                out.push(mode === "markdown" ? "---" : "* * *");
                break;
            case "BR":
                break;
            default:
                out.push(...renderBlocks(el, mode, depth));
        }
    }

    return out;
}

export function htmlToPlainText(html: string): string {
    return renderBlocks(parseBody(html), "text", 0).join("\n\n").trim();
}

export function htmlToMarkdown(html: string): string {
    return renderBlocks(parseBody(html), "markdown", 0).join("\n\n").trim();
}

// ── 원고 구성 ────────────────────────────────────────────

function orderChapters(source: ManuscriptSource): OrderedChapter[] {
    return [...source.chapters]
        .sort((a, b) => a.order - b.order)
        .map((chapter) => ({
            title: chapter.title,
            scenes: source.scenes
                .filter((s) => s.chapterId === chapter.id)
                .sort((a, b) => a.order - b.order),
        }));
}

export interface ManuscriptStats {
    chapters: number;
    scenes: number;
    chars: number;
}

export function getManuscriptStats(source: ManuscriptSource): ManuscriptStats {
    const chars = source.scenes.reduce(
        (sum, s) => sum + (s.content?.replace(/<[^>]*>/g, "").length ?? 0),
        0,
    );
    return {
        chapters: source.chapters.length,
        scenes: source.scenes.length,
        chars,
    };
}

export function isManuscriptEmpty(source: ManuscriptSource): boolean {
    return source.scenes.every(
        (s) => !s.content?.replace(/<[^>]*>/g, "").trim(),
    );
}

// ── 형식별 직렬화 ─────────────────────────────────────────

export function buildTxt(
    source: ManuscriptSource,
    options: ExportOptions,
): string {
    const parts: string[] = [];
    if (source.title.trim()) parts.push(source.title.trim());

    for (const chapter of orderChapters(source)) {
        const body: string[] = [chapter.title];
        for (const scene of chapter.scenes) {
            const text = htmlToPlainText(scene.content);
            if (options.includeSceneTitles && scene.title.trim()) {
                body.push(`[${scene.title.trim()}]`);
            }
            if (text) body.push(text);
        }
        parts.push(body.join("\n\n"));
    }

    return `${parts.join("\n\n\n")}\n`;
}

export function buildMarkdown(
    source: ManuscriptSource,
    options: ExportOptions,
): string {
    const parts: string[] = [];
    if (source.title.trim()) parts.push(`# ${source.title.trim()}`);

    for (const chapter of orderChapters(source)) {
        parts.push(`## ${chapter.title}`);
        for (const scene of chapter.scenes) {
            if (options.includeSceneTitles && scene.title.trim()) {
                parts.push(`### ${scene.title.trim()}`);
            }
            const md = htmlToMarkdown(scene.content);
            if (md) parts.push(md);
        }
    }

    return `${parts.join("\n\n")}\n`;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// HTML/PDF는 TipTap이 저장한 마크업을 그대로 살려 서식 손실이 없다.
export function buildHtmlDocument(
    source: ManuscriptSource,
    options: ExportOptions,
): string {
    const title = source.title.trim() || "제목 없는 작품";
    const chapters = orderChapters(source)
        .map((chapter) => {
            const scenes = chapter.scenes
                .map((scene) => {
                    const heading =
                        options.includeSceneTitles && scene.title.trim()
                            ? `<h3>${escapeHtml(scene.title.trim())}</h3>`
                            : "";
                    return `<section class="scene">${heading}${scene.content || ""}</section>`;
                })
                .join("\n");
            return `<section class="chapter"><h2>${escapeHtml(chapter.title)}</h2>\n${scenes}</section>`;
        })
        .join("\n");

    return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
    :root { color-scheme: light; }
    body {
        margin: 0 auto;
        max-width: 42rem;
        padding: 3rem 1.5rem 5rem;
        background: #fff;
        color: #18181b;
        font-family: "Nanum Myeongjo", "Batang", "Apple SD Gothic Neo", serif;
        font-size: 1rem;
        line-height: 1.9;
        word-break: keep-all;
    }
    h1 { font-size: 1.9rem; text-align: center; margin: 0 0 3.5rem; }
    h2 { font-size: 1.35rem; margin: 0 0 1.75rem; padding-bottom: .5rem; border-bottom: 1px solid #e4e4e7; }
    h3 { font-size: 1rem; color: #71717a; font-weight: 600; margin: 2rem 0 .75rem; }
    p { margin: 0 0 1.15rem; text-indent: 0; }
    blockquote { margin: 1.5rem 0; padding-left: 1rem; border-left: 3px solid #d4d4d8; color: #52525b; }
    hr { border: 0; border-top: 1px solid #e4e4e7; margin: 2.5rem 0; }
    ul, ol { padding-left: 1.5rem; margin: 0 0 1.15rem; }
    .chapter + .chapter { margin-top: 4rem; }
    @media print {
        body { max-width: none; padding: 0; font-size: 11pt; }
        @page { margin: 20mm 18mm; }
        .chapter { break-before: page; page-break-before: always; }
        .chapter:first-of-type { break-before: auto; page-break-before: avoid; }
        .scene { break-inside: auto; }
        h2 { break-after: avoid; page-break-after: avoid; }
    }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${chapters}
</body>
</html>
`;
}

// ── 파일 저장 / 인쇄 ──────────────────────────────────────

function sanitizeFileName(value: string): string {
    const cleaned = value
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    return cleaned.slice(0, 60) || "제목 없는 작품";
}

function todayStamp(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function buildFileName(title: string, extension: string): string {
    return `${sanitizeFileName(title)}_${todayStamp()}.${extension}`;
}

function downloadFile(fileName: string, mime: string, content: string): void {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // 다운로드가 시작되기 전에 URL이 해제되지 않도록 여유를 둔다
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// 숨김 iframe으로 인쇄 대화상자를 띄운다 (팝업 차단·현재 페이지 스타일 오염 회피)
function printHtmlDocument(html: string): void {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
        "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";

    iframe.onload = () => {
        const win = iframe.contentWindow;
        if (!win) {
            iframe.remove();
            return;
        }
        // afterprint 시점에만 정리한다. 타이머로 미리 지우면 인쇄가 중단될 수 있다.
        win.addEventListener("afterprint", () => iframe.remove(), {
            once: true,
        });
        win.focus();
        win.print();
    };

    document.body.appendChild(iframe);
    iframe.srcdoc = html;
}

// ── 진입점 ──────────────────────────────────────────────

export async function exportManuscript(
    format: ExportFormat,
    source: ManuscriptSource,
    options: ExportOptions,
): Promise<void> {
    switch (format) {
        case "txt":
            downloadFile(
                buildFileName(source.title, "txt"),
                "text/plain",
                buildTxt(source, options),
            );
            return;
        case "markdown":
            downloadFile(
                buildFileName(source.title, "md"),
                "text/markdown",
                buildMarkdown(source, options),
            );
            return;
        case "html":
            downloadFile(
                buildFileName(source.title, "html"),
                "text/html",
                buildHtmlDocument(source, options),
            );
            return;
        case "pdf":
            printHtmlDocument(buildHtmlDocument(source, options));
            return;
        case "json": {
            // 전체 백업 포맷 그대로 — Drive 업로드/스냅샷과 동일한 구조
            const data = await collectLocalData();
            downloadFile(
                `novel-bunker-backup_${todayStamp()}.json`,
                "application/json",
                JSON.stringify(data, null, 2),
            );
            return;
        }
    }
}
