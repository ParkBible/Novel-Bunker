import { applyImportedData, type BackupData, collectLocalData } from "./backup";
import { db, type Snapshot } from "./index";
import { DAY_MS, selectExpired } from "./retention";
import { computeStats } from "./snapshotStats";
import { recordWriting } from "./writingLog";

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
    loresChanged?: number;
    charactersChanged?: number;
}

// ── 보관 정책 ────────────────────────────────────────────────
// 자동 버전은 retention.ts 의 칸 규칙으로 솎는다
const MANUAL_MAX = 20; // 직접 저장한 버전 최대 개수
const MAX_AGE_MS = 90 * DAY_MS;

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
        loresChanged: s.loresChanged,
        charactersChanged: s.charactersChanged,
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

// 작품별 집필량 기록. 부가 정보라 실패해도 스냅샷 저장은 그대로 둔다.
// 직전 스냅샷이 없으면 전체 분량이 오늘 쓴 것으로 잡히므로 건너뛴다.
async function logWriting(
    data: BackupData,
    prev: BackupData | null,
    at: Date,
): Promise<void> {
    if (!prev) return;
    try {
        await recordWriting(db.writingLog, data, prev, at);
    } catch {
        // 무시
    }
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
        const createdAt = new Date();
        const id = await insertSnapshot(
            {
                createdAt,
                type,
                label,
                size: json.length,
                ...computeStats(data, prev),
            },
            json,
        );
        await logWriting(data, prev, createdAt);
        await snapshotOps.prune();
        return id;
    },

    // 마지막 스냅샷과 내용이 같으면 건너뛰는 자동 스냅샷.
    // label을 붙이면 구간별 정리에서 빠진다 (덮어쓰기 직전 보존본이 곧바로 밀려나지 않게)
    async createAutoIfChanged(label?: string): Promise<number | null> {
        const data = await collectLocalData();
        const json = JSON.stringify(data);
        const latest = await db.snapshots
            .orderBy("createdAt")
            .reverse()
            .first();
        const prev =
            latest?.id !== undefined ? await readData(latest.id) : null;
        if (prev) {
            // exportedAt은 수집 시각이라 매번 달라지므로 비교에서 제외
            const hasChanged =
                JSON.stringify({ ...data, exportedAt: "" }) !==
                JSON.stringify({ ...prev, exportedAt: "" });
            if (!hasChanged) {
                // 같은 내용이 이미 있으면 그 스냅샷에 이름을 붙여 정리 대상에서 뺀다
                if (label && latest?.id !== undefined && !latest.label) {
                    await db.snapshots.update(latest.id, { label });
                }
                return null;
            }
        }
        const createdAt = new Date();
        const id = await insertSnapshot(
            {
                createdAt,
                type: "auto",
                label,
                size: json.length,
                ...computeStats(data, prev),
            },
            json,
        );
        await logWriting(data, prev, createdAt);
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

    // 보관 정책 적용: 수동은 최대 개수, 자동은 구간별 씨닝 (이름 붙은 자동은 기간만)
    async prune(): Promise<void> {
        const all = await db.snapshots.orderBy("createdAt").reverse().toArray();
        const toDelete: number[] = [];

        const manuals = all.filter((s) => s.type === "manual");
        for (const s of manuals.slice(MANUAL_MAX)) {
            if (s.id !== undefined) toDelete.push(s.id);
        }

        const autos = all.flatMap((s) =>
            s.type === "auto" && s.id !== undefined
                ? [
                      {
                          id: s.id,
                          createdAt: s.createdAt,
                          // 이름 붙은 자동 스냅샷(Drive 받기 직전 보존본 등)
                          isPreserved: !!s.label,
                      },
                  ]
                : [],
        );
        toDelete.push(...selectExpired(autos, MAX_AGE_MS));

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
