import { applyImportedData, type BackupData, collectLocalData } from "./backup";
import { db, type Snapshot } from "./index";

// 목록 표시에 필요한 메타데이터만 (무거운 data 문자열 제외)
export interface SnapshotMeta {
    id: number;
    createdAt: Date;
    type: "manual" | "auto";
    label?: string;
    size: number; // data 바이트 근사치
}

// 보관 정책
const MANUAL_MAX = 20; // 수동 스냅샷 최대 개수
const AUTO_KEEP_RECENT = 12; // 최근 auto는 무조건 보존
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const AUTO_MAX_AGE_MS = 30 * DAY_MS; // 30일 지난 auto는 정리

function toMeta(s: Snapshot): SnapshotMeta {
    return {
        id: s.id as number,
        createdAt: s.createdAt,
        type: s.type,
        label: s.label,
        size: s.data.length,
    };
}

export const snapshotOps = {
    // 현재 로컬 상태를 스냅샷으로 저장
    async create(
        type: "manual" | "auto",
        label?: string,
    ): Promise<number | null> {
        const data = await collectLocalData();
        const json = JSON.stringify(data);
        const id = await db.snapshots.add({
            createdAt: new Date(),
            type,
            label,
            data: json,
        });
        return id as number;
    },

    // 마지막 스냅샷과 내용이 같으면 건너뛰는 자동 스냅샷
    async createAutoIfChanged(): Promise<number | null> {
        const data = await collectLocalData();
        const json = JSON.stringify(data);
        const latest = await db.snapshots
            .orderBy("createdAt")
            .reverse()
            .first();
        if (latest && latest.data === json) return null; // 변경 없음
        const id = await db.snapshots.add({
            createdAt: new Date(),
            type: "auto",
            data: json,
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

    // 보관 정책 적용: 수동은 최대 개수, 자동은 시간대별 씨닝
    async prune(): Promise<void> {
        const all = await db.snapshots.orderBy("createdAt").reverse().toArray();
        const now = Date.now();
        const toDelete: number[] = [];

        const manuals = all.filter((s) => s.type === "manual");
        for (const s of manuals.slice(MANUAL_MAX)) {
            if (s.id !== undefined) toDelete.push(s.id);
        }

        const autos = all.filter((s) => s.type === "auto");
        const seenBuckets = new Set<string>();
        autos.forEach((s, index) => {
            if (s.id === undefined) return;
            if (index < AUTO_KEEP_RECENT) return; // 최근 것은 보존
            const age = now - s.createdAt.getTime();
            if (age > AUTO_MAX_AGE_MS) {
                toDelete.push(s.id);
                return;
            }
            // 24시간 이내는 시간당 1개, 그 이후는 하루 1개만 유지
            const bucket =
                age < DAY_MS
                    ? `h${Math.floor(s.createdAt.getTime() / HOUR_MS)}`
                    : `d${Math.floor(s.createdAt.getTime() / DAY_MS)}`;
            if (seenBuckets.has(bucket)) {
                toDelete.push(s.id);
            } else {
                seenBuckets.add(bucket);
            }
        });

        if (toDelete.length > 0) await db.snapshots.bulkDelete(toDelete);
    },
};
