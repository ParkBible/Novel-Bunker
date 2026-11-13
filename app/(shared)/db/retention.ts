// 자동 버전 보관 규칙. 이 기기 기록과 Drive 기록이 같이 쓴다.
// 최근 1시간은 5분 간격, 오늘은 1시간 간격, 어제 이전은 하루 2개(오전/오후)만 남긴다.
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;
const FINE_WINDOW_MS = HOUR_MS;
const FINE_BUCKET_MS = 5 * MINUTE_MS;
const TODAY_BUCKET_MS = HOUR_MS;

/**
 * 자동 버전이 속할 보관 칸. 같은 칸에서는 최신 하나만 남는다.
 * null이면 보관 기간을 넘겨 지울 대상.
 */
export function retentionBucket(
    at: number,
    now: number,
    todayStart: number,
    maxAgeMs: number,
): string | null {
    const age = now - at;
    if (age > maxAgeMs) return null;
    if (age <= FINE_WINDOW_MS) return `f${Math.floor(at / FINE_BUCKET_MS)}`;
    if (at >= todayStart) return `t${Math.floor(at / TODAY_BUCKET_MS)}`;
    // epoch를 12시간으로 나누면 UTC 기준이라 시간대에 따라 하루가 셋으로 쪼개진다
    const d = new Date(at);
    const half = d.getHours() < 12 ? "a" : "p";
    return `o${d.getFullYear()}-${d.getMonth()}-${d.getDate()}${half}`;
}

export interface RetentionItem<Id> {
    id: Id;
    createdAt: Date;
    // 통째로 바뀌기 직전 보존본처럼 칸 정리에서 빼고 보관 기간만 지키는 버전
    isPreserved: boolean;
}

/** 최신순으로 받은 자동 버전 중 지울 것의 id */
export function selectExpired<Id>(
    items: RetentionItem<Id>[],
    maxAgeMs: number,
    now: number = Date.now(),
): Id[] {
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    const todayStart = midnight.getTime();
    const seenBuckets = new Set<string>();
    const expired: Id[] = [];
    for (const item of items) {
        const bucket = retentionBucket(
            item.createdAt.getTime(),
            now,
            todayStart,
            maxAgeMs,
        );
        if (bucket === null) {
            expired.push(item.id);
        } else if (!item.isPreserved) {
            if (seenBuckets.has(bucket)) expired.push(item.id);
            else seenBuckets.add(bucket);
        }
    }
    return expired;
}
