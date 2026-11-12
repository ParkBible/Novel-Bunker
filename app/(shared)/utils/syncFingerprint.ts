import type { BackupData } from "../db/backup";

// 로컬(IndexedDB에서 꺼낸 Date 객체)과 원격(JSON 문자열 날짜)을 같은 기준으로
// 비교하려고 날짜를 문자열로, 키 순서를 정렬된 순서로 맞춘다.
// JSON.stringify처럼 값이 undefined인 키는 뺀다.
function canonicalize(value: unknown): unknown {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value !== null && typeof value === "object") {
        const record = value as Record<string, unknown>;
        return Object.fromEntries(
            Object.keys(record)
                .filter((key) => record[key] !== undefined)
                .sort()
                .map((key) => [key, canonicalize(record[key])]),
        );
    }
    return value;
}

/**
 * 동기화 대상 내용의 지문(SHA-256). 내용이 같으면 기기와 상관없이 같은 값이 나온다.
 * 설정(settings)은 뺀다 — activeProjectId처럼 작품을 열기만 해도 바뀌는 값이 있어서
 * 넣으면 아무것도 안 고쳤는데 "이 기기에서 바뀜"으로 잡힌다.
 */
export async function contentFingerprint(data: BackupData): Promise<string> {
    const { version, exportedAt, settings, ...content } = data;
    const bytes = new TextEncoder().encode(
        JSON.stringify(canonicalize(content)),
    );
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash), (byte) =>
        byte.toString(16).padStart(2, "0"),
    ).join("");
}
