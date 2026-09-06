import type { BackupData } from "./backup";
import { type DriveCacheRow, db } from "./index";

// Drive 스냅샷 요약 계산용 캐시 접근 레이어. 자세한 용도는 DriveCacheRow 주석 참고.
// 캐시가 없거나 깨졌으면 null을 돌려주고, 호출부는 요약을 생략한다.

type DriveCacheKey = DriveCacheRow["key"];

export async function readDriveCacheJson(
    key: DriveCacheKey,
): Promise<string | null> {
    const row = await db.driveCache.get(key);
    return row?.data ?? null;
}

export async function readDriveCache(
    key: DriveCacheKey,
): Promise<BackupData | null> {
    const json = await readDriveCacheJson(key);
    if (json === null) return null;
    try {
        return JSON.parse(json) as BackupData;
    } catch {
        return null;
    }
}

export async function writeDriveCacheJson(
    key: DriveCacheKey,
    json: string,
): Promise<void> {
    await db.driveCache.put({ key, data: json });
}
