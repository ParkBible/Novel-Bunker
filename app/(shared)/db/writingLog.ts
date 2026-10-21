import type { Table } from "dexie";
import type { BackupData } from "./backup";
import { plainLength } from "./snapshotStats";

// 작품별 하루 집필량. 스냅샷 요약(added/removed)은 전 작품 합산이라
// 작품 대시보드에 그대로 쓸 수 없어서, 스냅샷을 남길 때 작품별로 나눠 따로 쌓는다.
// 파생 데이터라 백업/동기화 대상이 아니다. (기기마다 따로 쌓인다)
export interface WritingLog {
    projectId: number;
    date: string; // 로컬 날짜 YYYY-MM-DD
    added: number; // 그날 늘어난 글자 수 (씬 단위 증가분의 합)
    removed: number; // 그날 줄어든 글자 수
    chars: number; // 그날 마지막 기록 시점의 작품 총 글자 수
}

export type WritingLogTable = Table<WritingLog, [number, string]>;

// UTC가 아닌 로컬 날짜 기준. 자정 직후 쓴 글이 전날로 잡히지 않게 한다.
export function dateKey(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
}

interface ProjectDelta {
    added: number;
    removed: number;
    chars: number;
}

// 두 시점 사이의 작품별 글자 증감. 삭제된 씬은 직전 시점의 projectId로 센다.
export function projectDeltas(
    data: BackupData,
    prev: BackupData,
): Map<number, ProjectDelta> {
    const result = new Map<number, ProjectDelta>();
    const entry = (projectId: number) => {
        let e = result.get(projectId);
        if (!e) {
            e = { added: 0, removed: 0, chars: 0 };
            result.set(projectId, e);
        }
        return e;
    };

    const prevById = new Map(prev.scenes.map((s) => [s.id as number, s]));
    const currentIds = new Set<number>();

    for (const scene of data.scenes) {
        currentIds.add(scene.id as number);
        const e = entry(scene.projectId);
        const len = plainLength(scene.content);
        e.chars += len;
        const delta =
            len - plainLength(prevById.get(scene.id as number)?.content);
        if (delta > 0) e.added += delta;
        else e.removed += -delta;
    }
    for (const [id, scene] of prevById) {
        if (currentIds.has(id)) continue;
        entry(scene.projectId).removed += plainLength(scene.content);
    }
    return result;
}

// 직전 스냅샷 대비 증감을 해당 날짜 기록에 더한다.
// 마이그레이션(트랜잭션 테이블)과 런타임(db 테이블) 양쪽에서 쓴다.
export async function recordWriting(
    table: WritingLogTable,
    data: BackupData,
    prev: BackupData,
    at: Date,
): Promise<void> {
    const date = dateKey(at);
    for (const [projectId, d] of projectDeltas(data, prev)) {
        if (d.added === 0 && d.removed === 0) continue;
        const existing = await table.get([projectId, date]);
        await table.put({
            projectId,
            date,
            added: (existing?.added ?? 0) + d.added,
            removed: (existing?.removed ?? 0) + d.removed,
            chars: d.chars,
        });
    }
}
