import type { BackupData } from "../db/backup";

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
