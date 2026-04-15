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
    aiMessageOps,
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
                    }): { requestAccessToken(): void };
                };
            };
        };
    }
}

// ── 상수 ──────────────────────────────────────────────────────
const DRIVE_FILE_NAME = "novelbunker-data.json";
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
                    reject(new Error(response.error));
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
        const metadata = JSON.stringify({
            name: DRIVE_FILE_NAME,
            parents: ["appDataFolder"],
        });
        const boundary = "novelbunker_boundary";
        const body =
            `--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n` +
            `--${boundary}\r\nContent-Type: application/json\r\n\r\n${json}\r\n` +
            `--${boundary}--`;

        await authFetch(`${UPLOAD_API}/files?uploadType=multipart`, {
            method: "POST",
            headers: {
                "Content-Type": `multipart/related; boundary=${boundary}`,
            },
            body,
        });
    }
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
