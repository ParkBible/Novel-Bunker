import type { BackupData } from "../db/backup";
import type { Character, Lore } from "../db/index";

// ── HTML → 문단(줄) 배열 ──────────────────────────────────────
// TipTap이 생성하는 <p>/<blockquote>/<br> 등을 줄바꿈으로 바꾼 뒤
// 태그를 제거하고 비어있지 않은 줄만 반환한다. (DOM 비의존 — 테스트 용이)
export function htmlToParagraphs(html: string): string[] {
    if (!html) return [];
    const withBreaks = html
        .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n");
    const text = withBreaks
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

// ── 줄 단위 LCS diff ──────────────────────────────────────────
export type DiffType = "same" | "add" | "del";
export interface DiffLine {
    type: DiffType;
    text: string;
}

export function diffLines(a: string[], b: string[]): DiffLine[] {
    const n = a.length;
    const m = b.length;
    // dp[i][j] = a[i..], b[j..]의 LCS 길이
    const dp: number[][] = Array.from({ length: n + 1 }, () =>
        new Array<number>(m + 1).fill(0),
    );
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            dp[i][j] =
                a[i] === b[j]
                    ? dp[i + 1][j + 1] + 1
                    : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }

    const result: DiffLine[] = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
        if (a[i] === b[j]) {
            result.push({ type: "same", text: a[i] });
            i++;
            j++;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) {
            result.push({ type: "del", text: a[i] });
            i++;
        } else {
            result.push({ type: "add", text: b[j] });
            j++;
        }
    }
    while (i < n) result.push({ type: "del", text: a[i++] });
    while (j < m) result.push({ type: "add", text: b[j++] });
    return result;
}

// ── 씬 단위 비교 ──────────────────────────────────────────────
export type SceneStatus = "added" | "removed" | "modified" | "unchanged";
export interface SceneDiff {
    sceneId: number;
    title: string;
    status: SceneStatus;
    added: number; // 추가된 줄 수
    removed: number; // 삭제된 줄 수
    lines: DiffLine[];
    order: number;
    chapterId: number;
}

// 제목 + 본문을 한 배열로 (제목 변경도 diff에 드러나도록)
function sceneToLines(title: string, content: string): string[] {
    return [`# ${title}`, ...htmlToParagraphs(content)];
}

/**
 * 두 백업(A=이전, B=이후)의 씬을 id로 매칭해 씬별 diff를 계산한다.
 * @returns 변경된 씬이 앞에 오도록 정렬된 목록
 */
export function diffScenes(a: BackupData, b: BackupData): SceneDiff[] {
    const aById = new Map(a.scenes.map((s) => [s.id as number, s]));
    const bById = new Map(b.scenes.map((s) => [s.id as number, s]));
    const ids = new Set<number>([...aById.keys(), ...bById.keys()]);

    const diffs: SceneDiff[] = [];
    for (const id of ids) {
        const sa = aById.get(id);
        const sb = bById.get(id);
        const ref = sb ?? sa;
        if (!ref) continue;

        const linesA = sa ? sceneToLines(sa.title, sa.content) : [];
        const linesB = sb ? sceneToLines(sb.title, sb.content) : [];
        const lines = diffLines(linesA, linesB);
        const added = lines.filter((l) => l.type === "add").length;
        const removed = lines.filter((l) => l.type === "del").length;

        let status: SceneStatus;
        if (!sa) status = "added";
        else if (!sb) status = "removed";
        else if (added > 0 || removed > 0) status = "modified";
        else status = "unchanged";

        diffs.push({
            sceneId: id,
            title: ref.title,
            status,
            added,
            removed,
            lines,
            order: ref.order,
            chapterId: ref.chapterId,
        });
    }

    // 변경된 씬 먼저, 그 안에서는 챕터/순서대로
    const rank: Record<SceneStatus, number> = {
        modified: 0,
        added: 1,
        removed: 2,
        unchanged: 3,
    };
    return diffs.sort((x, y) => {
        if (rank[x.status] !== rank[y.status])
            return rank[x.status] - rank[y.status];
        if (x.chapterId !== y.chapterId) return x.chapterId - y.chapterId;
        return x.order - y.order;
    });
}

// ── 설정집·인물 단위 비교 ─────────────────────────────────────
// 씬과 달리 여러 칸으로 나뉜 항목이라 칸마다 "이름표: 값" 줄을 만들어 같은 줄 비교에 태운다.
// 순서·수정 시각은 내용이 아니라서 비교에서 뺀다.

type FieldKind = "short" | "long" | "tags";

export const LORE_FIELDS = [
    { key: "category", kind: "short" },
    { key: "description", kind: "long" },
] as const satisfies readonly { key: keyof Lore; kind: FieldKind }[];

export const CHARACTER_FIELDS = [
    { key: "group", kind: "short" },
    { key: "age", kind: "short" },
    { key: "gender", kind: "short" },
    { key: "role", kind: "short" },
    { key: "mbti", kind: "short" },
    { key: "tags", kind: "tags" },
    { key: "appearance", kind: "long" },
    { key: "personality", kind: "long" },
    { key: "description", kind: "long" },
] as const satisfies readonly { key: keyof Character; kind: FieldKind }[];

export type LoreFieldKey = (typeof LORE_FIELDS)[number]["key"];
// 관계는 인물 레코드 밖(characterRelationships)에 있지만 "누가 누구에게"는 그 인물의 정보로 보여준다
export type CharacterFieldKey =
    | (typeof CHARACTER_FIELDS)[number]["key"]
    | "relationships";

export interface EntryDiff {
    id: number;
    title: string;
    status: Exclude<SceneStatus, "unchanged">;
    lines: DiffLine[];
}

interface EntryContent {
    id: number;
    title: string;
    lines: string[];
}

function fieldLines(label: string, kind: FieldKind, value: unknown): string[] {
    if (kind === "tags") {
        const tags = Array.isArray(value) ? value : [];
        return tags.length > 0 ? [`${label}: ${tags.join(", ")}`] : [];
    }
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) return [];
    if (kind === "short") return [`${label}: ${text}`];
    const paragraphs = htmlToParagraphs(text);
    return paragraphs.length > 0 ? [`[${label}]`, ...paragraphs] : [];
}

function loreContents(
    data: BackupData | null,
    label: (key: LoreFieldKey) => string,
): EntryContent[] {
    return [...(data?.lores ?? [])]
        .sort((a, b) =>
            (a.category ?? "") !== (b.category ?? "")
                ? (a.category ?? "").localeCompare(b.category ?? "")
                : a.order - b.order,
        )
        .map((lore) => ({
            id: lore.id as number,
            title: lore.name,
            lines: [
                `# ${lore.name}`,
                ...LORE_FIELDS.flatMap(({ key, kind }) =>
                    fieldLines(label(key), kind, lore[key]),
                ),
            ],
        }));
}

function characterContents(
    data: BackupData | null,
    label: (key: CharacterFieldKey) => string,
): EntryContent[] {
    const characters = data?.characters ?? [];
    const nameById = new Map(characters.map((c) => [c.id as number, c.name]));
    const relationships = data?.characterRelationships ?? [];
    return [...characters]
        .sort((a, b) => a.order - b.order)
        .map((character) => ({
            id: character.id as number,
            title: character.name,
            lines: [
                `# ${character.name}`,
                ...CHARACTER_FIELDS.flatMap(({ key, kind }) =>
                    fieldLines(label(key), kind, character[key]),
                ),
                ...relationships
                    .filter((r) => r.fromCharacterId === character.id)
                    .map(
                        (r) =>
                            `${label("relationships")} → ${nameById.get(r.toCharacterId) ?? ""}: ${r.label}`,
                    )
                    .sort(),
            ],
        }));
}

// 바뀐 항목만 돌려준다. 줄 비교는 내용이 다른 항목에만 돌린다.
function diffEntries(
    before: EntryContent[],
    after: EntryContent[],
): EntryDiff[] {
    const beforeById = new Map(before.map((e) => [e.id, e]));
    const afterIds = new Set(after.map((e) => e.id));
    const diffs: EntryDiff[] = [];

    for (const entry of after) {
        const prev = beforeById.get(entry.id);
        if (prev && prev.lines.join("\n") === entry.lines.join("\n")) continue;
        diffs.push({
            id: entry.id,
            title: entry.title,
            status: prev ? "modified" : "added",
            lines: diffLines(prev?.lines ?? [], entry.lines),
        });
    }
    for (const entry of before) {
        if (afterIds.has(entry.id)) continue;
        diffs.push({
            id: entry.id,
            title: entry.title,
            status: "removed",
            lines: diffLines(entry.lines, []),
        });
    }
    return diffs;
}

/** 두 백업(A=이전, B=이후)의 설정집 항목 중 바뀐 것. A가 없으면 B 전부가 새 항목이다 */
export function diffLores(
    a: BackupData | null,
    b: BackupData,
    label: (key: LoreFieldKey) => string,
): EntryDiff[] {
    return diffEntries(loreContents(a, label), loreContents(b, label));
}

/** 두 백업(A=이전, B=이후)의 인물 중 바뀐 것 (그 인물이 맺은 관계 포함) */
export function diffCharacters(
    a: BackupData | null,
    b: BackupData,
    label: (key: CharacterFieldKey) => string,
): EntryDiff[] {
    return diffEntries(
        characterContents(a, label),
        characterContents(b, label),
    );
}
