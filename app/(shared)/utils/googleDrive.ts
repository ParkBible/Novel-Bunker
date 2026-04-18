import type {
    AiConversation,
    AiMessage,
    Chapter,
    Character,
    CharacterRelationship,
    Lore,
    Scene,
    Setting,
} from "../db";
import { db } from "../db";
import {
    aiConversationOps,
    chapterOps,
    characterOps,
    loreOps,
    relationshipOps,
    sceneOps,
    settingsOps,
} from "../db/operations";

// ── GIS 타입 선언 ──────────────────────────────────────────────
declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient(config: {
                        client_id: string;
                        scope: string;
                        callback: (response: {
                            access_token: string;
                            error?: string;
                        }) => void;
                        prompt?: string;
                        hint?: string;
                    }): { requestAccessToken(): void };
                };
            };
        };
    }
}

// ── 마지막 동기화 시각 (localStorage) ────────────────────────
const LAST_SYNCED_AT_KEY = "novelbunker_drive_last_synced_at";

export function getLastSyncedAt(): Date | null {
    try {
        const raw = localStorage.getItem(LAST_SYNCED_AT_KEY);
        if (!raw) return null;
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? null : d;
    } catch {
        return null;
    }
}

export function saveLastSyncedAt(date: Date): void {
    try {
        localStorage.setItem(LAST_SYNCED_AT_KEY, date.toISOString());
    } catch {
        // private browsing 등에서 조용히 무시
    }
}

// ── 상수 ──────────────────────────────────────────────────────
const DRIVE_FILE_NAME = "novelbunker-data.json";
const MANUAL_SNAPSHOT_PREFIX = "novelbunker-snapshot-manual-";
const AUTO_SNAPSHOT_PREFIX = "novelbunker-snapshot-auto-";
const MAX_MANUAL_SNAPSHOTS = 5;
const MAX_AUTO_SNAPSHOTS = 30;
const AUTO_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000; // 5분
const LAST_AUTO_SNAPSHOT_KEY = "novelbunker_last_auto_snapshot";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

// ── 토큰 (메모리에만 저장) ────────────────────────────────────
let accessToken: string | null = null;

export function setAccessToken(token: string): void {
    accessToken = token;
}

export function getAccessToken(): string | null {
    return accessToken;
}

export function clearAccessToken(): void {
    accessToken = null;
}

// ── OAuth ─────────────────────────────────────────────────────
export function requestToken(clientId: string): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!window.google) {
            reject(
                new Error("Google Identity Services가 로드되지 않았습니다."),
            );
            return;
        }
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: DRIVE_SCOPE,
            callback: (response) => {
                if (response.error) {
                    const msg =
                        response.error === "popup_failed_to_open"
                            ? "팝업이 차단되었습니다. 브라우저 주소창의 팝업 차단 아이콘을 클릭해 허용해 주세요."
                            : response.error === "popup_closed_by_user"
                              ? "로그인 창이 닫혔습니다. 다시 시도해 주세요."
                              : response.error === "access_denied"
                                ? "Drive 접근 권한이 거부되었습니다."
                                : response.error;
                    reject(new Error(msg));
                } else {
                    resolve(response.access_token);
                }
            },
        });
        client.requestAccessToken();
    });
}

// ── 인증 fetch ────────────────────────────────────────────────
async function authFetch(
    url: string,
    options: RequestInit = {},
): Promise<Response> {
    if (!accessToken) throw new Error("인증이 필요합니다.");
    const res = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(options.headers ?? {}),
        },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Drive API 오류 (${res.status}): ${text}`);
    }
    return res;
}

// ── Drive 파일 탐색 ───────────────────────────────────────────
export async function findBackupFile(): Promise<string | null> {
    const res = await authFetch(
        `${DRIVE_API}/files?spaces=appDataFolder&q=name%3D'${DRIVE_FILE_NAME}'&fields=files(id)`,
    );
    const data = await res.json();
    return (data.files as { id: string }[] | undefined)?.[0]?.id ?? null;
}

// ── 스냅샷 목록 조회 ──────────────────────────────────────────
export interface SnapshotInfo {
    id: string;
    name: string;
    createdAt: Date;
    type: "manual" | "auto";
}

export async function listSnapshots(): Promise<SnapshotInfo[]> {
    const q = encodeURIComponent("name contains 'novelbunker-snapshot-'");
    const res = await authFetch(
        `${DRIVE_API}/files?spaces=appDataFolder&q=${q}&fields=files(id,name,createdTime)`,
    );
    const data = await res.json();
    const files = (data.files ?? []) as {
        id: string;
        name: string;
        createdTime: string;
    }[];
    return files
        .map((f) => ({
            id: f.id,
            name: f.name,
            createdAt: new Date(f.createdTime),
            type: f.name.startsWith(MANUAL_SNAPSHOT_PREFIX)
                ? ("manual" as const)
                : ("auto" as const),
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ── Drive 파일 콘텐츠 텍스트로 다운로드 ──────────────────────
async function downloadFileText(fileId: string): Promise<string> {
    const res = await authFetch(`${DRIVE_API}/files/${fileId}?alt=media`);
    return res.text();
}

// ── 스냅샷 파일 업로드 (multipart) ───────────────────────────
async function uploadNewFile(name: string, json: string): Promise<void> {
    const metadata = JSON.stringify({ name, parents: ["appDataFolder"] });
    const boundary = "novelbunker_boundary";
    const body =
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${json}\r\n` +
        `--${boundary}--`;
    await authFetch(`${UPLOAD_API}/files?uploadType=multipart`, {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
    });
}

// ── 타입별 오래된 스냅샷 정리 ────────────────────────────────
async function pruneSnapshots(prefix: string, max: number): Promise<void> {
    const all = await listSnapshots();
    const typed = all.filter((s) => s.name.startsWith(prefix));
    if (typed.length <= max) return;
    await Promise.all(
        typed
            .slice(max)
            .map((s) =>
                authFetch(`${DRIVE_API}/files/${s.id}`, { method: "DELETE" }),
            ),
    );
}

// ── 수동 스냅샷 생성 ──────────────────────────────────────────
export async function createManualSnapshot(): Promise<void> {
    const fileId = await findBackupFile();
    if (!fileId) return;
    const json = await downloadFileText(fileId);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    await uploadNewFile(`${MANUAL_SNAPSHOT_PREFIX}${ts}.json`, json);
    await pruneSnapshots(MANUAL_SNAPSHOT_PREFIX, MAX_MANUAL_SNAPSHOTS);
}

// ── 자동 스냅샷 생성 (1시간 쓰로틀) ─────────────────────────
export async function createAutoSnapshot(): Promise<void> {
    try {
        const lastStr = localStorage.getItem(LAST_AUTO_SNAPSHOT_KEY);
        if (lastStr) {
            const elapsed = Date.now() - new Date(lastStr).getTime();
            if (elapsed < AUTO_SNAPSHOT_INTERVAL_MS) return;
        }
    } catch {
        // ignore
    }
    const fileId = await findBackupFile();
    if (!fileId) return;
    const json = await downloadFileText(fileId);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    await uploadNewFile(`${AUTO_SNAPSHOT_PREFIX}${ts}.json`, json);
    await pruneSnapshots(AUTO_SNAPSHOT_PREFIX, MAX_AUTO_SNAPSHOTS);
    try {
        localStorage.setItem(LAST_AUTO_SNAPSHOT_KEY, new Date().toISOString());
    } catch {
        // ignore
    }
}

// ── 스냅샷 복원 ───────────────────────────────────────────────
export async function restoreSnapshot(fileId: string): Promise<void> {
    const json = await downloadFileText(fileId);
    const data: BackupData = JSON.parse(json);
    await applyImportedData(data);
}

// ── 스냅샷 삭제 ───────────────────────────────────────────────
export async function deleteSnapshot(fileId: string): Promise<void> {
    await authFetch(`${DRIVE_API}/files/${fileId}`, { method: "DELETE" });
}

// ── 로컬 데이터가 비어있는지 확인 ────────────────────────────
export async function isLocalDataEmpty(): Promise<boolean> {
    const [chapters, scenes, characters, lores] = await Promise.all([
        chapterOps.getAll(),
        sceneOps.getAll(),
        characterOps.getAll(),
        loreOps.getAll(),
    ]);
    return (
        chapters.length === 0 &&
        scenes.length === 0 &&
        characters.length === 0 &&
        lores.length === 0
    );
}

// ── 로컬 데이터 수집 ──────────────────────────────────────────
interface BackupData {
    version: number;
    exportedAt: string;
    chapters: Chapter[];
    scenes: Scene[];
    characters: Character[];
    characterRelationships: CharacterRelationship[];
    lores: Lore[];
    settings: Setting[];
    aiConversations: AiConversation[];
    aiMessages: AiMessage[];
}

export async function collectLocalData(): Promise<BackupData> {
    const [
        chapters,
        scenes,
        characters,
        characterRelationships,
        lores,
        settings,
        aiConversations,
        aiMessages,
    ] = await Promise.all([
        chapterOps.getAll(),
        sceneOps.getAll(),
        characterOps.getAll(),
        relationshipOps.getAll(),
        loreOps.getAll(),
        settingsOps.getAll(),
        aiConversationOps.getAll(),
        db.aiMessages.toArray(),
    ]);

    return {
        version: 2,
        exportedAt: new Date().toISOString(),
        chapters,
        scenes,
        characters,
        characterRelationships,
        lores,
        settings,
        aiConversations,
        aiMessages,
    };
}

// ── Drive에 업로드 ────────────────────────────────────────────
export async function exportToDrive(): Promise<void> {
    const data = await collectLocalData();
    const json = JSON.stringify(data);
    const fileId = await findBackupFile();

    if (fileId) {
        await authFetch(`${UPLOAD_API}/files/${fileId}?uploadType=media`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: json,
        });
    } else {
        await uploadNewFile(DRIVE_FILE_NAME, json);
    }
}

// ── 수동 스냅샷 생성 후 업로드 ───────────────────────────────
export async function exportToDriveWithSnapshot(): Promise<void> {
    await createManualSnapshot();
    await exportToDrive();
}

// ── Drive에서 다운로드 ────────────────────────────────────────
export async function importFromDrive(): Promise<void> {
    const fileId = await findBackupFile();
    if (!fileId) throw new Error("Drive에 저장된 백업이 없습니다.");

    const res = await authFetch(`${DRIVE_API}/files/${fileId}?alt=media`);
    const data: BackupData = await res.json();
    await applyImportedData(data);
}

// ── 데이터 복원 ───────────────────────────────────────────────
async function applyImportedData(data: BackupData): Promise<void> {
    const toDate = (v: unknown): Date =>
        v instanceof Date ? v : new Date(v as string);

    const chapters = data.chapters.map((c) => ({
        ...c,
        createdAt: toDate(c.createdAt),
        updatedAt: toDate(c.updatedAt),
    }));
    const scenes = data.scenes.map((s) => ({
        ...s,
        createdAt: toDate(s.createdAt),
        updatedAt: toDate(s.updatedAt),
    }));
    const lores = data.lores.map((l) => ({
        ...l,
        createdAt: toDate(l.createdAt),
        updatedAt: toDate(l.updatedAt),
    }));

    const aiConversations = (data.aiConversations ?? []).map((c) => ({
        ...c,
        createdAt: toDate(c.createdAt),
        updatedAt: toDate(c.updatedAt),
    }));
    const aiMessages = (data.aiMessages ?? []).map((m) => ({
        ...m,
        createdAt: toDate(m.createdAt),
    }));

    await db.transaction(
        "rw",
        [
            db.chapters,
            db.scenes,
            db.characters,
            db.characterRelationships,
            db.lores,
            db.settings,
            db.aiConversations,
            db.aiMessages,
        ],
        async () => {
            await db.chapters.clear();
            await db.scenes.clear();
            await db.characters.clear();
            await db.characterRelationships.clear();
            await db.lores.clear();
            await db.settings.clear();
            await db.aiConversations.clear();
            await db.aiMessages.clear();

            await db.chapters.bulkAdd(chapters);
            await db.scenes.bulkAdd(scenes);
            await db.characters.bulkAdd(data.characters);
            await db.characterRelationships.bulkAdd(
                data.characterRelationships,
            );
            await db.lores.bulkAdd(lores);
            await db.settings.bulkAdd(data.settings);
            if (aiConversations.length > 0)
                await db.aiConversations.bulkAdd(aiConversations);
            if (aiMessages.length > 0) await db.aiMessages.bulkAdd(aiMessages);
        },
    );
}
