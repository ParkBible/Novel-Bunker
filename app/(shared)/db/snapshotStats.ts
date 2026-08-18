import { htmlToParagraphs } from "../utils/diff";
import type { BackupData } from "./backup";
import type { Scene } from "./index";

// 스냅샷 저장 시점에 계산해 두는 타임라인 요약값.
// db/index.ts의 마이그레이션에서도 쓰이므로 별도 모듈로 둔다.
// (여기서 index/backup은 타입만 가져와 런타임 순환 참조가 없다)

const EXCERPT_MAX = 80;

const plainLength = (html: string | undefined): number =>
    (html ?? "").replace(/<[^>]*>/g, "").length;

function truncate(text: string): string {
    return text.length > EXCERPT_MAX ? `${text.slice(0, EXCERPT_MAX)}…` : text;
}

// 이 버전에서 새로 쓰인 문장을 고른다. 직전 버전에 없던 첫 문단이
// 가장 설명력이 높고, 없으면 해당 씬의 첫 문단으로 폴백한다.
function pickExcerpt(scene: Scene, before: Scene | undefined): string {
    const paragraphs = htmlToParagraphs(scene.content ?? "");
    if (paragraphs.length === 0) return scene.title?.trim() ?? "";
    if (before) {
        const seen = new Set(htmlToParagraphs(before.content ?? ""));
        const fresh = paragraphs.find((p) => !seen.has(p));
        if (fresh) return truncate(fresh);
    }
    return truncate(paragraphs[0]);
}

export interface SnapshotStats {
    chars: number;
    added: number;
    removed: number;
    scenesChanged: number;
    excerpt: string;
}

export function computeStats(
    data: BackupData,
    prev: BackupData | null,
): SnapshotStats {
    const chars = data.scenes.reduce(
        (sum, s) => sum + plainLength(s.content),
        0,
    );

    if (!prev) {
        const first = data.scenes.find((s) => plainLength(s.content) > 0);
        return {
            chars,
            added: chars,
            removed: 0,
            scenesChanged: data.scenes.length,
            excerpt: first ? pickExcerpt(first, undefined) : "",
        };
    }

    const prevById = new Map(prev.scenes.map((s) => [s.id as number, s]));
    const currentIds = new Set(data.scenes.map((s) => s.id as number));

    let added = 0;
    let removed = 0;
    let scenesChanged = 0;
    let changed: { scene: Scene; before: Scene | undefined } | null = null;

    for (const scene of data.scenes) {
        const before = prevById.get(scene.id as number);
        const delta = plainLength(scene.content) - plainLength(before?.content);
        if (delta > 0) added += delta;
        else removed += -delta;
        // 길이가 같아도 내용이 바뀌었을 수 있으므로 문자열로 판정한다
        const isChanged =
            !before ||
            before.content !== scene.content ||
            before.title !== scene.title;
        if (isChanged) {
            scenesChanged++;
            if (!changed) changed = { scene, before };
        }
    }
    for (const [id, scene] of prevById) {
        if (currentIds.has(id)) continue;
        removed += plainLength(scene.content);
        scenesChanged++; // 삭제된 씬도 변경으로 센다
    }

    return {
        chars,
        added,
        removed,
        scenesChanged,
        excerpt: changed ? pickExcerpt(changed.scene, changed.before) : "",
    };
}
