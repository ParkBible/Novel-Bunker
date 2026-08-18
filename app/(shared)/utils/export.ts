import type { Chapter, Scene } from "../db";
import { collectLocalData } from "../db/backup";

// 씬 본문은 TipTap이 만든 HTML 문자열이다. 내보내기 형식마다 이 HTML을
// 텍스트/마크다운으로 변환하거나(=아래 렌더러), 스타일을 입혀 그대로 감싼다.

export type ExportFormat = "txt" | "markdown" | "html" | "pdf" | "json";

// 씬 구분선을 무엇으로 표시할지: 씬 제목 / 챕터 내 순번 / 표시 안 함
export type SceneHeadingMode = "title" | "number" | "none";

export interface ExportOptions {
    sceneHeading: SceneHeadingMode;
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

// 씬마다 붙일 머리글. 번호는 챕터 안에서 1부터 다시 센다.
// 제목 모드인데 제목이 비어 있으면 머리글을 생략한다(빈 대괄호 방지).
function sceneHeading(
    scene: Scene,
    indexInChapter: number,
    options: ExportOptions,
): string | null {
    if (options.sceneHeading === "number") return `씬 ${indexInChapter + 1}`;
    if (options.sceneHeading === "title") return scene.title.trim() || null;
    return null;
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
        chapter.scenes.forEach((scene, i) => {
            const text = htmlToPlainText(scene.content);
            const heading = sceneHeading(scene, i, options);
            if (heading) body.push(`[${heading}]`);
            if (text) body.push(text);
        });
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
        chapter.scenes.forEach((scene, i) => {
            const heading = sceneHeading(scene, i, options);
            if (heading) parts.push(`### ${heading}`);
            const md = htmlToMarkdown(scene.content);
            if (md) parts.push(md);
        });
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

function countChars(scenes: Scene[]): number {
    return scenes.reduce(
        (sum, s) => sum + (s.content?.replace(/<[^>]*>/g, "").length ?? 0),
        0,
    );
}

function formatKoreanDate(date: Date): string {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// HTML/PDF는 TipTap이 저장한 마크업을 그대로 살려 서식 손실이 없다.
// 읽기용 문서이므로 표지·목차·챕터 헤더를 만들어 조판한다.
export function buildHtmlDocument(
    source: ManuscriptSource,
    options: ExportOptions,
): string {
    const title = source.title.trim() || "제목 없는 작품";
    const chapters = orderChapters(source);
    const stats = getManuscriptStats(source);
    // 챕터가 하나뿐이면 목차와 표지 페이지 분리는 과하다
    const isLong = chapters.length > 1;

    const pad = (n: number) => String(n).padStart(2, "0");

    const toc = isLong
        ? `<nav class="toc" aria-label="목차">
<h2 class="toc-title">목차</h2>
<ol>
${chapters
    .map(
        (chapter, i) =>
            `<li><a href="#chapter-${i + 1}"><span class="toc-num">${pad(i + 1)}</span><span class="toc-label">${escapeHtml(chapter.title)}</span><span class="toc-dots"></span><span class="toc-count">${countChars(chapter.scenes).toLocaleString()}자</span></a></li>`,
    )
    .join("\n")}
</ol>
</nav>`
        : "";

    const body = chapters
        .map((chapter, i) => {
            const scenes = chapter.scenes
                .map((scene, sceneIndex) => {
                    const headingText = sceneHeading(
                        scene,
                        sceneIndex,
                        options,
                    );
                    // 씬 머리글이 없으면 장식 기호로 장면 전환을 표시한다
                    const divider =
                        sceneIndex > 0 && !headingText
                            ? '<div class="scene-break" aria-hidden="true">✻</div>\n'
                            : "";
                    const heading = headingText
                        ? `<h3 class="scene-title">${escapeHtml(headingText)}</h3>`
                        : "";
                    return `${divider}<section class="scene">${heading}${scene.content || ""}</section>`;
                })
                .join("\n");

            return `<article class="chapter" id="chapter-${i + 1}">
<header class="chapter-head">
<span class="chapter-num">CHAPTER ${pad(i + 1)}</span>
<h2>${escapeHtml(chapter.title)}</h2>
<span class="chapter-ornament" aria-hidden="true"></span>
</header>
${scenes}
</article>`;
        })
        .join("\n");

    return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${escapeHtml(title)}</title>
<style>
    :root {
        color-scheme: light dark;
        --bg: #fbfaf7;
        --text: #1f1c17;
        --muted: #8b8378;
        --rule: #e6e0d5;
        --accent: #a17f4e;
        --serif: Georgia, "Nanum Myeongjo", "Noto Serif KR", AppleMyungjo, Batang, "바탕", serif;
        --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    }
    @media (prefers-color-scheme: dark) {
        :root {
            --bg: #161513;
            --text: #e7e2d8;
            --muted: #918a7d;
            --rule: #2f2c27;
            --accent: #c2a173;
        }
    }

    * { box-sizing: border-box; }
    body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: var(--serif);
        font-size: clamp(1rem, 0.96rem + 0.2vw, 1.0625rem);
        line-height: 1.95;
        letter-spacing: -0.01em;
        word-break: keep-all;
        overflow-wrap: break-word;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
    }
    .page { max-width: 34rem; margin: 0 auto; padding: 0 1.5rem 6rem; }

    /* 표지 */
    .cover { text-align: center; padding: 6.5rem 0 4.5rem; }
    .cover h1 {
        font-size: clamp(1.85rem, 1.4rem + 2.2vw, 2.6rem);
        font-weight: 600;
        line-height: 1.35;
        letter-spacing: -0.03em;
        margin: 0 0 1.5rem;
    }
    .cover .meta {
        font-family: var(--sans);
        font-size: 0.75rem;
        letter-spacing: 0.06em;
        color: var(--muted);
        margin: 0;
    }
    .cover .rule { width: 2.5rem; height: 1px; background: var(--accent); margin: 2.75rem auto 0; opacity: 0.6; }

    /* 목차 */
    .toc { border-top: 1px solid var(--rule); padding: 2rem 0 0; margin-bottom: 5rem; }
    .toc-title {
        font-family: var(--sans);
        font-size: 0.68rem;
        font-weight: 600;
        letter-spacing: 0.2em;
        color: var(--muted);
        margin: 0 0 1.25rem;
    }
    .toc ol { list-style: none; margin: 0; padding: 0; }
    .toc li + li { margin-top: 0.35rem; }
    .toc a {
        display: flex;
        align-items: baseline;
        gap: 0.7rem;
        color: inherit;
        text-decoration: none;
        padding: 0.25rem 0;
        transition: color 0.15s;
    }
    .toc a:hover { color: var(--accent); }
    .toc-num { font-family: var(--sans); font-size: 0.7rem; color: var(--accent); font-variant-numeric: tabular-nums; }
    .toc-label { font-size: 0.95rem; }
    .toc-dots { flex: 1 1 auto; min-width: 1rem; border-bottom: 1px dotted var(--rule); transform: translateY(-0.3em); }
    .toc-count { font-family: var(--sans); font-size: 0.7rem; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }

    /* 챕터 */
    .chapter + .chapter { margin-top: 6rem; }
    .chapter-head { text-align: center; margin-bottom: 3.25rem; }
    .chapter-num {
        display: block;
        font-family: var(--sans);
        font-size: 0.62rem;
        font-weight: 600;
        letter-spacing: 0.28em;
        color: var(--accent);
        margin-bottom: 0.9rem;
    }
    .chapter-head h2 {
        font-size: 1.45rem;
        font-weight: 600;
        letter-spacing: -0.025em;
        line-height: 1.45;
        margin: 0;
    }
    .chapter-ornament { display: block; width: 2rem; height: 1px; background: var(--rule); margin: 1.75rem auto 0; }

    /* 본문 */
    .scene-title {
        font-family: var(--sans);
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.14em;
        color: var(--muted);
        text-align: center;
        margin: 3rem 0 1.75rem;
    }
    .scene-break { text-align: center; color: var(--accent); margin: 3rem 0; font-size: 0.8rem; letter-spacing: 0.4em; opacity: 0.75; }
    .scene p { margin: 0 0 1.35rem; }
    .scene p:last-child { margin-bottom: 0; }
    .scene p:empty { min-height: 1.35rem; }
    .scene h4, .scene h5, .scene h6 { font-size: 1rem; font-weight: 600; margin: 2.25rem 0 1rem; }
    blockquote {
        margin: 2.25rem 0;
        padding: 0 0 0 1.25rem;
        border-left: 2px solid var(--accent);
        color: var(--muted);
    }
    blockquote p:last-child { margin-bottom: 0; }
    hr { border: 0; height: 1px; background: var(--rule); width: 55%; margin: 3rem auto; }
    ul, ol { padding-left: 1.35rem; margin: 0 0 1.35rem; }
    li { margin: 0.3rem 0; }
    a { color: var(--accent); text-underline-offset: 0.15em; }
    strong { font-weight: 700; }
    em { font-style: italic; }

    .colophon {
        font-family: var(--sans);
        font-size: 0.68rem;
        letter-spacing: 0.06em;
        color: var(--muted);
        text-align: center;
        border-top: 1px solid var(--rule);
        margin-top: 6rem;
        padding-top: 2rem;
    }

    /* 인쇄 / PDF */
    @media print {
        :root { --bg: #fff; --text: #000; --muted: #555; --rule: #ccc; --accent: #555; }
        @page { margin: 22mm 20mm; }
        body { font-size: 10.5pt; line-height: 1.75; }
        .page { max-width: none; padding: 0; }
        .toc, .colophon { display: none; }
        .cover { padding: 4rem 0 0; ${isLong ? "break-after: page; page-break-after: always;" : ""} }
        .chapter + .chapter { break-before: page; page-break-before: always; margin-top: 0; }
        .chapter-head { break-after: avoid; page-break-after: avoid; padding-top: 1rem; }
        .scene-title { break-after: avoid; page-break-after: avoid; }
        p { orphans: 3; widows: 3; }
        blockquote, li { break-inside: avoid; }
        a { color: inherit; text-decoration: none; }
    }
</style>
</head>
<body>
<main class="page">
<header class="cover">
<h1>${escapeHtml(title)}</h1>
<p class="meta">챕터 ${stats.chapters} · 씬 ${stats.scenes} · ${stats.chars.toLocaleString()}자</p>
<div class="rule" aria-hidden="true"></div>
</header>
${toc}
${body}
<footer class="colophon">${formatKoreanDate(new Date())} · NovelBunker</footer>
</main>
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
