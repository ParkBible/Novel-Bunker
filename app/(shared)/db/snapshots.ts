import { htmlToParagraphs } from "../utils/diff";
import { applyImportedData, type BackupData, collectLocalData } from "./backup";
import { db, type Scene, type Snapshot } from "./index";

// 목록 표시에 필요한 메타데이터만 (무거운 data 문자열 제외)
export interface SnapshotMeta {
    id: number;
    createdAt: Date;
    type: "manual" | "auto";
    label?: string;
    size: number; // data 바이트 근사치
    chars?: number;
    added?: number;
    removed?: number;
    excerpt?: string;
}

// ── 보관 정책 ────────────────────────────────────────────────
// 최근 1시간은 5분 간격으로 촘촘히, 오늘 것은 1시간 간격으로 통합,
// 어제 이전은 하루 대표 2개(오전/오후)만 남긴다.
const MANUAL_MAX = 20; // 직접 저장한 버전 최대 개수
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const FINE_WINDOW_MS = HOUR_MS; // 세밀 보관 구간 (최근 1시간)
const FINE_BUCKET_MS = 5 * MINUTE_MS;
const TODAY_BUCKET_MS = HOUR_MS;
const MAX_AGE_MS = 90 * DAY_MS;

const EXCERPT_MAX = 80;

/**
 * 자동 스냅샷이 속할 보관 구간 키. 같은 키를 가진 것들 중 최신 하나만 남는다.
 * null이면 보관 기간을 넘겨 삭제 대상.
 */
export function retentionBucket(
    at: number,
    now: number,
    todayStart: number,
): string | null {
    const age = now - at;
    if (age > MAX_AGE_MS) return null;
    // 최근 1시간: 5분 간격
    if (age <= FINE_WINDOW_MS) return `f${Math.floor(at / FINE_BUCKET_MS)}`;
    // 오늘(자정 이후): 1시간 간격
    if (at >= todayStart) return `t${Math.floor(at / TODAY_BUCKET_MS)}`;
    // 어제 이전: 하루 2개(오전/오후). epoch를 12시간으로 나누면 UTC 기준이라
    // 시간대에 따라 하루가 셋으로 쪼개진다 → 로컬 날짜로 버킷을 만든다.
    const d = new Date(at);
    const half = d.getHours() < 12 ? "a" : "p";
    return `o${d.getFullYear()}-${d.getMonth()}-${d.getDate()}${half}`;
}

function toMeta(s: Snapshot): SnapshotMeta {
    return {
        id: s.id as number,
        createdAt: s.createdAt,
        type: s.type,
        label: s.label,
        size: s.data.length,
        chars: s.chars,
        added: s.added,
        removed: s.removed,
        excerpt: s.excerpt,
    };
}

// ── 버전 요약 계산 ───────────────────────────────────────────

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

interface SnapshotStats {
    chars: number;
    added: number;
    removed: number;
    excerpt: string;
}

function computeStats(
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
            excerpt: first ? pickExcerpt(first, undefined) : "",
        };
    }

    const prevById = new Map(prev.scenes.map((s) => [s.id as number, s]));
    const currentIds = new Set(data.scenes.map((s) => s.id as number));

    let added = 0;
    let removed = 0;
    let changed: { scene: Scene; before: Scene | undefined } | null = null;

    for (const scene of data.scenes) {
        const before = prevById.get(scene.id as number);
        const delta = plainLength(scene.content) - plainLength(before?.content);
        if (delta > 0) added += delta;
        else removed += -delta;
        // 길이가 같아도 내용이 바뀌었을 수 있으므로 문자열로 판정한다
        if (!changed && (!before || before.content !== scene.content)) {
            changed = { scene, before };
        }
    }
    for (const [id, scene] of prevById) {
        if (!currentIds.has(id)) removed += plainLength(scene.content);
    }

    return {
        chars,
        added,
        removed,
        excerpt: changed ? pickExcerpt(changed.scene, changed.before) : "",
    };
}

async function latestSnapshot(): Promise<Snapshot | undefined> {
    return db.snapshots.orderBy("createdAt").reverse().first();
}

export const snapshotOps = {
    // 현재 로컬 상태를 스냅샷으로 저장
    async create(
        type: "manual" | "auto",
        label?: string,
    ): Promise<number | null> {
        const data = await collectLocalData();
        const latest = await latestSnapshot();
        const prev = latest ? (JSON.parse(latest.data) as BackupData) : null;
        const id = await db.snapshots.add({
            createdAt: new Date(),
            type,
            label,
            data: JSON.stringify(data),
            ...computeStats(data, prev),
        });
        await snapshotOps.prune();
        return id as number;
    },

    // 마지막 스냅샷과 내용이 같으면 건너뛰는 자동 스냅샷
    async createAutoIfChanged(): Promise<number | null> {
        const data = await collectLocalData();
        const json = JSON.stringify(data);
        const latest = await latestSnapshot();
        let prev: BackupData | null = null;
        if (latest) {
            prev = JSON.parse(latest.data) as BackupData;
            // exportedAt은 수집 시각이라 매번 달라지므로 비교에서 제외
            const hasChanged =
                JSON.stringify({ ...data, exportedAt: "" }) !==
                JSON.stringify({ ...prev, exportedAt: "" });
            if (!hasChanged) return null; // 변경 없음
        }
        const id = await db.snapshots.add({
            createdAt: new Date(),
            type: "auto",
            data: json,
            ...computeStats(data, prev),
        });
        await snapshotOps.prune();
        return id as number;
    },

    // 메타데이터 목록 (최신순)
    async list(): Promise<SnapshotMeta[]> {
        const all = await db.snapshots.orderBy("createdAt").reverse().toArray();
        return all.map(toMeta);
    },

    // 특정 스냅샷의 백업 데이터 파싱
    async getData(id: number): Promise<BackupData | null> {
        const snap = await db.snapshots.get(id);
        if (!snap) return null;
        return JSON.parse(snap.data) as BackupData;
    },

    // 스냅샷으로 전체 복원
    async restore(id: number): Promise<void> {
        const data = await snapshotOps.getData(id);
        if (!data) throw new Error("스냅샷을 찾을 수 없습니다.");
        await applyImportedData(data);
    },

    async delete(id: number): Promise<void> {
        await db.snapshots.delete(id);
    },

    // 보관 정책 적용: 수동은 최대 개수, 자동은 구간별 씨닝
    async prune(): Promise<void> {
        const all = await db.snapshots.orderBy("createdAt").reverse().toArray();
        const now = Date.now();
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        const todayStart = midnight.getTime();
        const toDelete: number[] = [];

        const manuals = all.filter((s) => s.type === "manual");
        for (const s of manuals.slice(MANUAL_MAX)) {
            if (s.id !== undefined) toDelete.push(s.id);
        }

        const autos = all.filter((s) => s.type === "auto");
        const seenBuckets = new Set<string>();
        autos.forEach((s, index) => {
            if (s.id === undefined) return;
            const bucket = retentionBucket(
                s.createdAt.getTime(),
                now,
                todayStart,
            );
            if (bucket === null) {
                toDelete.push(s.id);
                return;
            }
            // 가장 최신 한 건은 어떤 경우에도 남긴다
            if (seenBuckets.has(bucket) && index > 0) toDelete.push(s.id);
            else seenBuckets.add(bucket);
        });

        if (toDelete.length > 0) await db.snapshots.bulkDelete(toDelete);
    },
};
