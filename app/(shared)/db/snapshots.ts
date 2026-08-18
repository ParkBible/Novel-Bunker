import { applyImportedData, type BackupData, collectLocalData } from "./backup";
import { db, type Snapshot } from "./index";
import { computeStats } from "./snapshotStats";

// 목록 표시용 메타데이터. 본문은 snapshotData 테이블에 있어 여기 없다.
export interface SnapshotMeta {
    id: number;
    createdAt: Date;
    type: "manual" | "auto";
    label?: string;
    size?: number; // 본문 길이 (진단용)
    chars?: number;
    added?: number;
    removed?: number;
    scenesChanged?: number;
    changedScenes?: string[];
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
        size: s.size,
        chars: s.chars,
        added: s.added,
        removed: s.removed,
        scenesChanged: s.scenesChanged,
        changedScenes: s.changedScenes,
    };
}

// ── 저장소 접근 (메타/본문 분리) ─────────────────────────────

async function readData(id: number): Promise<BackupData | null> {
    const row = await db.snapshotData.get(id);
    if (!row) return null;
    return JSON.parse(row.data) as BackupData;
}

// 새 스냅샷을 메타 + 본문 두 테이블에 한 트랜잭션으로 기록
async function insertSnapshot(
    meta: Omit<Snapshot, "id">,
    json: string,
): Promise<number> {
    return db.transaction("rw", [db.snapshots, db.snapshotData], async () => {
        const id = (await db.snapshots.add(meta)) as number;
        await db.snapshotData.put({ id, data: json });
        return id;
    });
}

// 직전 스냅샷의 본문 (없으면 null)
async function latestData(): Promise<BackupData | null> {
    const latest = await db.snapshots.orderBy("createdAt").reverse().first();
    if (!latest || latest.id === undefined) return null;
    return readData(latest.id);
}

export const snapshotOps = {
    // 현재 로컬 상태를 스냅샷으로 저장
    async create(
        type: "manual" | "auto",
        label?: string,
    ): Promise<number | null> {
        const data = await collectLocalData();
        const json = JSON.stringify(data);
        const prev = await latestData();
        const id = await insertSnapshot(
            {
                createdAt: new Date(),
                type,
                label,
                size: json.length,
                ...computeStats(data, prev),
            },
            json,
        );
        await snapshotOps.prune();
        return id;
    },

    // 마지막 스냅샷과 내용이 같으면 건너뛰는 자동 스냅샷
    async createAutoIfChanged(): Promise<number | null> {
        const data = await collectLocalData();
        const json = JSON.stringify(data);
        const prev = await latestData();
        if (prev) {
            // exportedAt은 수집 시각이라 매번 달라지므로 비교에서 제외
            const hasChanged =
                JSON.stringify({ ...data, exportedAt: "" }) !==
                JSON.stringify({ ...prev, exportedAt: "" });
            if (!hasChanged) return null; // 변경 없음
        }
        const id = await insertSnapshot(
            {
                createdAt: new Date(),
                type: "auto",
                size: json.length,
                ...computeStats(data, prev),
            },
            json,
        );
        await snapshotOps.prune();
        return id;
    },

    // 메타데이터 목록 (최신순). 본문 테이블은 건드리지 않는다.
    async list(): Promise<SnapshotMeta[]> {
        const all = await db.snapshots.orderBy("createdAt").reverse().toArray();
        return all.map(toMeta);
    },

    // 특정 스냅샷의 백업 데이터 파싱
    async getData(id: number): Promise<BackupData | null> {
        return readData(id);
    },

    // 스냅샷으로 전체 복원
    async restore(id: number): Promise<void> {
        const data = await snapshotOps.getData(id);
        if (!data) throw new Error("스냅샷을 찾을 수 없습니다.");
        await applyImportedData(data);
    },

    async delete(id: number): Promise<void> {
        await db.transaction(
            "rw",
            [db.snapshots, db.snapshotData],
            async () => {
                await db.snapshots.delete(id);
                await db.snapshotData.delete(id);
            },
        );
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

        if (toDelete.length > 0) {
            await db.transaction(
                "rw",
                [db.snapshots, db.snapshotData],
                async () => {
                    await db.snapshots.bulkDelete(toDelete);
                    await db.snapshotData.bulkDelete(toDelete);
                },
            );
        }
    },
};
