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

export class DriveAuthError extends Error {
    constructor(msg: string) {
        super(msg);
        this.name = "DriveAuthError";
    }
}

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

// ── 마지막으로 동기화한 원격 버전 (Drive modifiedTime) ────────
// 벽시계 비교 대신 Drive가 부여한 modifiedTime 자체를 저장해 시계 오차를 방지한다.
const LAST_SYNCED_MODIFIED_KEY = "novelbunker_drive_last_synced_modified";

function getLastSyncedModified(): string | null {
    try {
        return localStorage.getItem(LAST_SYNCED_MODIFIED_KEY);
    } catch {
        return null;
    }
}

function saveLastSyncedModified(modifiedTime: string): void {
    try {
        localStorage.setItem(LAST_SYNCED_MODIFIED_KEY, modifiedTime);
    } catch {
        // ignore
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

// ── 토큰 (sessionStorage에 저장 — 탭을 닫으면 만료) ─────────────
const TOKEN_KEY = "gdriveAccessToken";
const TOKEN_TS_KEY = "gdriveAccessTokenTs";
const TOKEN_TTL_MS = 55 * 60 * 1000; // GIS 토큰 수명 1시간 기준 55분
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // 만료 5분 전에 갱신

// 다음 무음 갱신까지 대기해야 할 ms 반환 (이미 만료 시 0)
export function getTokenRefreshDelayMs(): number {
    const ts = sessionStorage.getItem(TOKEN_TS_KEY);
    if (!ts) return 0;
    const elapsed = Date.now() - Number(ts);
    return Math.max(0, TOKEN_TTL_MS - TOKEN_REFRESH_MARGIN_MS - elapsed);
}

// 서버 API를 통한 토큰 자동 갱신 (refresh_token은 httpOnly 쿠키에 보관).
// 성공 시 새 access_token, 실패(쿠키 없음/만료 등) 시 null.
export async function tryRefreshTokenSilently(
    clientId: string,
): Promise<string | null> {
    try {
        const res = await fetch("/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientId }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return (data.access_token as string) ?? null;
    } catch {
        return null;
    }
}

export function setAccessToken(token: string): void {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TOKEN_TS_KEY, Date.now().toString());
}

export function getAccessToken(): string | null {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const ts = sessionStorage.getItem(TOKEN_TS_KEY);
    if (ts && Date.now() - Number(ts) > TOKEN_TTL_MS) {
        clearAccessToken();
        return null;
    }
    return token;
}

export function clearAccessToken(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_TS_KEY);
}

// ── OAuth redirect flow ───────────────────────────────────────
const PENDING_ACTION_KEY = "drivePendingAction";
const AUTH_RETURN_PATH_KEY = "driveAuthReturnPath";

export function savePendingAction(action: "upload" | "download"): void {
    sessionStorage.setItem(PENDING_ACTION_KEY, action);
}

export function getPendingAction(): "upload" | "download" | null {
    return sessionStorage.getItem(PENDING_ACTION_KEY) as
        | "upload"
        | "download"
        | null;
}

export function clearPendingAction(): void {
    sessionStorage.removeItem(PENDING_ACTION_KEY);
}

const AUTH_CHANNEL = "novelbunker_drive_auth";

export function broadcastAuthToken(token: string): void {
    try {
        const bc = new BroadcastChannel(AUTH_CHANNEL);
        bc.postMessage({ type: "auth_complete", token });
        bc.close();
    } catch {
        // BroadcastChannel 미지원 환경 무시
    }
}

export function listenForAuthToken(
    callback: (token: string) => void,
): () => void {
    try {
        const bc = new BroadcastChannel(AUTH_CHANNEL);
        bc.onmessage = (e: MessageEvent) => {
            if (e.data?.type === "auth_complete" && e.data.token) {
                callback(e.data.token as string);
            }
        };
        return () => bc.close();
    } catch {
        return () => {};
    }
}

// ── PKCE 헬퍼 ────────────────────────────────────────────────
const PKCE_VERIFIER_KEY = "driveCodeVerifier";

function base64UrlEncode(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

function generateCodeVerifier(): string {
    const buf = new Uint8Array(32);
    crypto.getRandomValues(buf);
    return base64UrlEncode(buf);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
    const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(verifier),
    );
    return base64UrlEncode(new Uint8Array(hash));
}

// Authorization Code + PKCE flow → 서버가 refresh_token을 httpOnly 쿠키에 저장.
export async function redirectToAuth(clientId: string): Promise<void> {
    sessionStorage.setItem(AUTH_RETURN_PATH_KEY, window.location.pathname);
    const redirectUri = `${window.location.origin}/auth`;

    // 팝업 차단 방지: 사용자 제스처 컨텍스트에서 먼저 빈 팝업을 연 뒤,
    // 비동기 PKCE 계산이 끝나면 인증 URL로 이동시킨다.
    const popup = window.open(
        "",
        "driveAuth",
        "width=520,height=650,left=100,top=100",
    );

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    // 팝업과 메인 창이 localStorage를 공유하므로 여기에 보관
    localStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: DRIVE_SCOPE,
        access_type: "offline",
        prompt: "consent", // refresh_token 항상 발급
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        include_granted_scopes: "true",
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    if (popup) {
        popup.location.href = authUrl;
    } else {
        // 팝업 차단 시 전체 페이지 리다이렉트 폴백
        window.location.href = authUrl;
    }
}

export function getPkceVerifier(): string | null {
    return localStorage.getItem(PKCE_VERIFIER_KEY);
}

export function clearPkceVerifier(): void {
    localStorage.removeItem(PKCE_VERIFIER_KEY);
}

export function getAuthReturnPath(): string {
    return sessionStorage.getItem(AUTH_RETURN_PATH_KEY) || "/";
}

export function clearAuthReturnPath(): void {
    sessionStorage.removeItem(AUTH_RETURN_PATH_KEY);
}

// ── OAuth popup (legacy, kept for reference) ──────────────────
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
    const token = getAccessToken();
    if (!token) throw new Error("인증이 필요합니다.");
    const res = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.headers ?? {}),
        },
    });
    if (!res.ok) {
        const text = await res.text();
        if (res.status === 401)
            throw new DriveAuthError(`Drive API 인증 오류: ${text}`);
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

// ── Drive 백업 파일 메타데이터 (id + 수정 시각) ───────────────
async function getRemoteFileMeta(): Promise<{
    id: string;
    modifiedTime: string;
} | null> {
    const res = await authFetch(
        `${DRIVE_API}/files?spaces=appDataFolder&q=name%3D'${DRIVE_FILE_NAME}'&fields=files(id,modifiedTime)`,
    );
    const data = await res.json();
    const file = (
        data.files as { id: string; modifiedTime: string }[] | undefined
    )?.[0];
    return file ?? null;
}

// 현재 Drive 파일의 modifiedTime을 "마지막 동기화 버전"으로 기록한다.
async function recordSyncedModified(): Promise<void> {
    const meta = await getRemoteFileMeta();
    if (meta) saveLastSyncedModified(meta.modifiedTime);
}

// ── 원격이 로컬보다 최신인지 확인 ────────────────────────────
// 다른 기기에서 이 기기가 마지막으로 동기화한 이후에 업로드했으면 true.
export async function checkRemoteNewer(): Promise<{
    stale: boolean;
    modifiedTime: Date | null;
}> {
    const meta = await getRemoteFileMeta();
    if (!meta) return { stale: false, modifiedTime: null };
    const lastSynced = getLastSyncedModified();
    const modifiedTime = new Date(meta.modifiedTime);
    // 한 번도 동기화한 적이 없는데 Drive에 백업이 있으면 stale로 간주
    const stale = lastSynced === null || meta.modifiedTime !== lastSynced;
    return { stale, modifiedTime };
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
    await Promise.allSettled(
        typed
            .slice(max)
            .map((s) =>
                authFetch(`${DRIVE_API}/files/${s.id}`, { method: "DELETE" }),
            ),
    );
}

// ── 서버 측 파일 복사 (files.copy) ──────────────────────────
async function copyFile(fileId: string, name: string): Promise<void> {
    await authFetch(`${DRIVE_API}/files/${fileId}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parents: ["appDataFolder"] }),
    });
}

// ── 수동 스냅샷 생성 ──────────────────────────────────────────
export async function createManualSnapshot(): Promise<void> {
    const fileId = await findBackupFile();
    if (!fileId) return;
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    await copyFile(fileId, `${MANUAL_SNAPSHOT_PREFIX}${ts}.json`);
    await pruneSnapshots(MANUAL_SNAPSHOT_PREFIX, MAX_MANUAL_SNAPSHOTS);
}

// ── 자동 스냅샷 생성 (5분 쓰로틀) ─────────────────────────
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
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    await copyFile(fileId, `${AUTO_SNAPSHOT_PREFIX}${ts}.json`);
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
    // 방금 올린 버전을 "마지막 동기화 버전"으로 기록 → stale 오탐 방지
    await recordSyncedModified();
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
    // 방금 받은 버전을 "마지막 동기화 버전"으로 기록
    await recordSyncedModified();
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
