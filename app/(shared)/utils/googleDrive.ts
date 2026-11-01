import {
    applyImportedData,
    type BackupData,
    collectLocalData,
} from "../db/backup";
import {
    readDriveCache,
    readDriveCacheJson,
    writeDriveCacheJson,
} from "../db/driveCache";
import { projectOps } from "../db/operations";
import { computeStats, type SnapshotStats } from "../db/snapshotStats";
import { apiRoutes } from "../routes";

export class DriveAuthError extends Error {
    constructor(msg: string) {
        super(msg);
        this.name = "DriveAuthError";
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

// ── 아직 Drive에 올리지 못한 로컬 변경 (localStorage) ─────────
// 자동 업로드는 30초 디바운스라 그 사이 화면을 옮기거나 탭을 닫으면 대기 중인
// 업로드가 사라진다. 변경 시각을 남겨 두고 다음에 자동 업로드가 붙는 화면에서 이어 올린다.
const UNSYNCED_SINCE_KEY = "novelbunker_drive_unsynced_since";

export function markUnsyncedChanges(): void {
    try {
        localStorage.setItem(UNSYNCED_SINCE_KEY, Date.now().toString());
    } catch {
        // ignore
    }
}

export function getUnsyncedSince(): string | null {
    try {
        return localStorage.getItem(UNSYNCED_SINCE_KEY);
    } catch {
        return null;
    }
}

/**
 * @param since 업로드를 시작할 때 읽은 값. 그 뒤에 또 바뀌었으면 지우지 않는다
 */
export function clearUnsyncedChanges(since?: string | null): void {
    try {
        if (since !== undefined && getUnsyncedSince() !== since) return;
        localStorage.removeItem(UNSYNCED_SINCE_KEY);
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
// openid email: 서버가 id_token으로 허용된 계정인지 확인하는 데 필요
const AUTH_SCOPE = `openid email ${DRIVE_SCOPE}`;
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

// 무음 갱신 결과. sessionRequired: refresh 쿠키는 있지만 세션이 없어 재로그인이 필요한 경우
// (세션 쿠키 도입 전에 로그인한 기존 Drive 사용자 등)
export interface SilentRefreshResult {
    token: string | null;
    sessionRequired: boolean;
}

// 서버 API를 통한 토큰 자동 갱신 (refresh_token은 httpOnly 쿠키에 보관).
// client ID는 서버 환경변수(GOOGLE_CLIENT_ID)를 쓰므로 보내지 않는다.
export async function tryRefreshTokenSilently(): Promise<SilentRefreshResult> {
    try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || typeof data.access_token !== "string") {
            return {
                token: null,
                sessionRequired: data.code === "session_required",
            };
        }
        return { token: data.access_token, sessionRequired: false };
    } catch {
        return { token: null, sessionRequired: false };
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
// 보류 액션(로그인 후 이어서 할 업로드/다운로드)은 그 액션을 만든 로그인에만 묶는다.
// loginId는 OAuth state로 왕복하며, 같은 loginId의 로그인이 끝났을 때만 실행된다.
// (AI 로그인·무음 갱신·실패한 로그인 뒤에 남은 다운로드가 로컬 데이터를 덮어쓰지 않도록)
const PENDING_ACTION_KEY = "drivePendingAction";
const COMPLETED_LOGIN_KEY = "driveCompletedLoginId";
const AUTH_RETURN_PATH_KEY = "driveAuthReturnPath";

export type PendingAction = "upload" | "download";

function readPending(): { action: PendingAction; loginId: string } | null {
    try {
        const raw = sessionStorage.getItem(PENDING_ACTION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (
            (parsed?.action === "upload" || parsed?.action === "download") &&
            typeof parsed.loginId === "string"
        ) {
            return parsed;
        }
    } catch {
        // 예전 형식(문자열만 저장) 등은 무시
    }
    return null;
}

export function hasPendingAction(): boolean {
    return readPending() !== null;
}

export function clearPendingAction(): void {
    sessionStorage.removeItem(PENDING_ACTION_KEY);
}

// 해당 로그인이 만든 보류 액션만 지운다 (그 사이 새로 시작된 로그인의 액션은 유지)
function clearPendingActionFor(loginId: string): void {
    if (readPending()?.loginId === loginId) clearPendingAction();
}

// 완료된 로그인과 짝이 맞는 보류 액션만 꺼낸다. 꺼내면 지운다.
export function takePendingActionFor(loginId: string): PendingAction | null {
    const pending = readPending();
    if (!pending || pending.loginId !== loginId) return null;
    clearPendingAction();
    return pending.action;
}

// 전체 페이지 리다이렉트로 로그인한 경우, 돌아온 페이지가 확인할 완료 표시
export function markLoginCompleted(loginId: string): void {
    sessionStorage.setItem(COMPLETED_LOGIN_KEY, loginId);
}

export function takeCompletedLoginId(): string | null {
    const id = sessionStorage.getItem(COMPLETED_LOGIN_KEY);
    sessionStorage.removeItem(COMPLETED_LOGIN_KEY);
    return id;
}

const AUTH_CHANNEL = "novelbunker_drive_auth";

export function broadcastAuthToken(token: string, loginId: string): void {
    try {
        const bc = new BroadcastChannel(AUTH_CHANNEL);
        bc.postMessage({ type: "auth_complete", token, loginId });
        bc.close();
    } catch {
        // BroadcastChannel 미지원 환경 무시
    }
}

export function listenForAuthToken(
    callback: (token: string, loginId: string) => void,
): () => void {
    try {
        const bc = new BroadcastChannel(AUTH_CHANNEL);
        bc.onmessage = (e: MessageEvent) => {
            if (e.data?.type === "auth_complete" && e.data.token) {
                callback(e.data.token as string, String(e.data.loginId ?? ""));
            }
        };
        return () => bc.close();
    } catch {
        return () => {};
    }
}

// 팝업이 로그인 없이 닫히면(취소·거절 화면에서 닫기) 그 로그인의 보류 액션을 버린다.
// 성공 시에는 팝업이 닫히기 전에 토큰을 브로드캐스트하므로, 메시지 처리가 끝날
// 여유를 둔 뒤 정리한다 (이미 꺼내 쓴 경우엔 지울 게 없음).
function watchPopupClosed(popup: Window, loginId: string): void {
    const timer = setInterval(() => {
        if (!popup.closed) return;
        clearInterval(timer);
        setTimeout(() => clearPendingActionFor(loginId), 1500);
    }, 500);
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

// OAuth client ID는 서버가 단일 기준으로 내려준다 (사용자 입력 없음)
let cachedClientId: string | null = null;

async function fetchGoogleClientId(): Promise<string> {
    if (cachedClientId) return cachedClientId;
    const res = await fetch(apiRoutes.authConfig);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.clientId !== "string") {
        throw new Error(data.error ?? "구글 로그인 설정을 불러오지 못했어요.");
    }
    cachedClientId = data.clientId as string;
    return cachedClientId;
}

// Authorization Code + PKCE flow → 서버가 refresh_token과 세션을 httpOnly 쿠키에 저장.
// Drive 연동과 AI 기능 로그인이 같은 흐름을 쓴다.
// pendingAction: Drive 버튼에서 시작한 로그인만 넘긴다. 없으면(AI 로그인 등) 기존 보류 액션을 지운다.
export async function redirectToAuth(
    options: { pendingAction?: PendingAction } = {},
): Promise<void> {
    const loginId = generateCodeVerifier(); // 무작위 값 (OAuth state)
    clearPendingAction();
    if (options.pendingAction) {
        sessionStorage.setItem(
            PENDING_ACTION_KEY,
            JSON.stringify({ action: options.pendingAction, loginId }),
        );
    }
    sessionStorage.setItem(AUTH_RETURN_PATH_KEY, window.location.pathname);
    const redirectUri = `${window.location.origin}/auth`;

    // 팝업 차단 방지: 사용자 제스처 컨텍스트에서 먼저 빈 팝업을 연 뒤,
    // 비동기 PKCE 계산이 끝나면 인증 URL로 이동시킨다.
    const popup = window.open(
        "",
        "driveAuth",
        "width=520,height=650,left=100,top=100",
    );

    let clientId: string;
    let codeVerifier: string;
    let codeChallenge: string;
    try {
        clientId = await fetchGoogleClientId();
        codeVerifier = generateCodeVerifier();
        codeChallenge = await generateCodeChallenge(codeVerifier);
    } catch (e) {
        // 로그인을 시작하지 못했으면 보류 액션도 남기지 않는다
        popup?.close();
        clearPendingActionFor(loginId);
        throw e;
    }
    // 팝업과 메인 창이 localStorage를 공유하므로 여기에 보관
    localStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: AUTH_SCOPE,
        access_type: "offline",
        prompt: "consent", // refresh_token 항상 발급
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        include_granted_scopes: "true",
        state: loginId,
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    if (popup) {
        popup.location.href = authUrl;
        watchPopupClosed(popup, loginId);
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

// ── Drive 파일 탐색 (id + 수정 시각) ──────────────────────────
export async function findBackupFile(): Promise<{
    id: string;
    modifiedTime: string;
} | null> {
    const res = await authFetch(
        `${DRIVE_API}/files?spaces=appDataFolder&q=name%3D'${DRIVE_FILE_NAME}'&fields=files(id,modifiedTime)`,
    );
    const data = await res.json();
    return (
        (
            data.files as { id: string; modifiedTime: string }[] | undefined
        )?.[0] ?? null
    );
}

// ── 원격이 로컬보다 최신인지 확인 ────────────────────────────
// 다른 기기에서 이 기기가 마지막으로 동기화한 이후에 업로드했으면 true.
export async function checkRemoteNewer(): Promise<{
    stale: boolean;
    modifiedTime: Date | null;
}> {
    const file = await findBackupFile();
    if (!file) return { stale: false, modifiedTime: null };
    const lastSynced = getLastSyncedModified();
    const modifiedTime = new Date(file.modifiedTime);
    // 한 번도 동기화한 적이 없는데 Drive에 백업이 있으면 stale로 간주
    const stale = lastSynced === null || file.modifiedTime !== lastSynced;
    return { stale, modifiedTime };
}

// ── 스냅샷 요약값 (Drive 파일 메타에 저장) ────────────────────
// 타임라인의 글자 증감·바뀐 씬은 스냅샷을 만든 기기에서 계산해 파일
// appProperties에 심어 둔다. 그래야 다른 기기에서도 본문을 내려받지 않고
// 목록만으로 그릴 수 있다. (요약이 생기기 전에 만든 스냅샷은 값이 없다)
const NAMES_SEPARATOR = "\u001f";
// appProperties는 값 하나가 짧아야 해서(수백 바이트 수준) 넉넉히 잡아 자른다.
// UI는 앞 두 개만 보여주고 나머지는 개수로 접으므로 잘려도 표시가 깨지지 않는다.
const NAMES_MAX_BYTES = 100;
// 이름 하나가 예산을 통째로 먹어 아무 이름도 안 남는 일을 막는 상한.
// 한글은 UTF-8로 3바이트라 20자면 60바이트 — 최소 한 개는 항상 들어간다.
const NAME_MAX_CHARS = 20;

// 빈 문자열(제목 없는 씬)도 자리를 지켜야 UI 폴백이 로컬과 같아진다.
function encodeSceneNames(names: string[]): string {
    const encoder = new TextEncoder();
    const kept: string[] = [];
    let bytes = 0;
    for (const raw of names) {
        const name = raw.trim().slice(0, NAME_MAX_CHARS);
        const size = encoder.encode(name).length + NAMES_SEPARATOR.length;
        if (kept.length > 0 && bytes + size > NAMES_MAX_BYTES) break;
        kept.push(name);
        bytes += size;
    }
    return kept.join(NAMES_SEPARATOR);
}

function encodeSnapshotStats(stats: SnapshotStats): Record<string, string> {
    return {
        nbAdded: String(stats.added),
        nbRemoved: String(stats.removed),
        nbScenes: String(stats.scenesChanged),
        nbNames: encodeSceneNames(stats.changedScenes),
    };
}

type SnapshotSummary = Pick<
    SnapshotInfo,
    "added" | "removed" | "scenesChanged" | "changedScenes"
>;

function decodeSnapshotStats(
    props: Record<string, string> | undefined,
): SnapshotSummary {
    if (!props) return {};
    const num = (raw: string | undefined): number | undefined => {
        if (raw === undefined) return undefined;
        const n = Number(raw);
        return Number.isFinite(n) ? n : undefined;
    };
    const names = props.nbNames;
    return {
        added: num(props.nbAdded),
        removed: num(props.nbRemoved),
        scenesChanged: num(props.nbScenes),
        changedScenes:
            names === undefined
                ? undefined
                : names === ""
                  ? []
                  : names.split(NAMES_SEPARATOR),
    };
}

/**
 * 새로 만들 스냅샷에 심을 요약값. 스냅샷 본문은 "마지막으로 업로드한 내용",
 * 비교 기준은 "직전 스냅샷 본문"이며 둘 다 로컬 캐시에서 읽는다.
 * 캐시가 없으면(첫 실행·다른 기기) 현재 상태를 본문으로 간주한다.
 * 요약 계산 실패가 스냅샷 생성 자체를 막지 않도록 null로 흘린다.
 */
async function prepareSnapshotStats(): Promise<{
    props: Record<string, string>;
    contentJson: string;
} | null> {
    try {
        const contentJson =
            (await readDriveCacheJson("lastUploaded")) ??
            JSON.stringify(await collectLocalData());
        const content = JSON.parse(contentJson) as BackupData;
        const baseline = await readDriveCache("baseline");
        return {
            props: encodeSnapshotStats(computeStats(content, baseline)),
            contentJson,
        };
    } catch {
        return null;
    }
}

// ── 스냅샷 목록 조회 ──────────────────────────────────────────
export interface SnapshotInfo {
    id: string;
    name: string;
    createdAt: Date;
    type: "manual" | "auto";
    // 타임라인 표시용 요약 (요약 도입 전 스냅샷에는 없다)
    added?: number;
    removed?: number;
    scenesChanged?: number;
    changedScenes?: string[];
}

export async function listSnapshots(): Promise<SnapshotInfo[]> {
    const q = encodeURIComponent("name contains 'novelbunker-snapshot-'");
    const res = await authFetch(
        `${DRIVE_API}/files?spaces=appDataFolder&q=${q}&fields=files(id,name,createdTime,appProperties)`,
    );
    const data = await res.json();
    const files = (data.files ?? []) as {
        id: string;
        name: string;
        createdTime: string;
        appProperties?: Record<string, string>;
    }[];
    return files
        .map((f) => ({
            id: f.id,
            name: f.name,
            createdAt: new Date(f.createdTime),
            type: f.name.startsWith(MANUAL_SNAPSHOT_PREFIX)
                ? ("manual" as const)
                : ("auto" as const),
            ...decodeSnapshotStats(f.appProperties),
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ── Drive 파일 콘텐츠 텍스트로 다운로드 ──────────────────────
async function downloadFileText(fileId: string): Promise<string> {
    const res = await authFetch(`${DRIVE_API}/files/${fileId}?alt=media`);
    return res.text();
}

// ── 새 파일 업로드 (multipart) — 응답에서 modifiedTime 반환 ───
async function uploadNewFile(
    name: string,
    json: string,
): Promise<string | null> {
    const metadata = JSON.stringify({ name, parents: ["appDataFolder"] });
    const boundary = "novelbunker_boundary";
    const body =
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${json}\r\n` +
        `--${boundary}--`;
    const res = await authFetch(
        `${UPLOAD_API}/files?uploadType=multipart&fields=modifiedTime`,
        {
            method: "POST",
            headers: {
                "Content-Type": `multipart/related; boundary=${boundary}`,
            },
            body,
        },
    );
    const data = await res.json();
    return (data.modifiedTime as string | undefined) ?? null;
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
async function copyFile(
    fileId: string,
    name: string,
    appProperties?: Record<string, string>,
): Promise<void> {
    await authFetch(`${DRIVE_API}/files/${fileId}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name,
            parents: ["appDataFolder"],
            ...(appProperties ? { appProperties } : {}),
        }),
    });
}

// 스냅샷 복사 + 요약 심기 + 비교 기준 갱신을 한 흐름으로 묶는다.
// 비교 기준은 복사가 성공한 뒤에만 옮겨, 실패 시 다음 스냅샷이 어긋나지 않게 한다.
async function copySnapshotWithStats(
    fileId: string,
    name: string,
): Promise<void> {
    const stats = await prepareSnapshotStats();
    await copyFile(fileId, name, stats?.props);
    if (stats) await writeDriveCacheJson("baseline", stats.contentJson);
}

// ── 수동 스냅샷 생성 ──────────────────────────────────────────
export async function createManualSnapshot(): Promise<void> {
    const file = await findBackupFile();
    if (!file) return;
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    await copySnapshotWithStats(file.id, `${MANUAL_SNAPSHOT_PREFIX}${ts}.json`);
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
    const file = await findBackupFile();
    if (!file) return;
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    await copySnapshotWithStats(file.id, `${AUTO_SNAPSHOT_PREFIX}${ts}.json`);
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

// ── 스냅샷 데이터 조회 (버전 비교용) ──────────────────────────
export async function getSnapshotData(fileId: string): Promise<BackupData> {
    const json = await downloadFileText(fileId);
    return JSON.parse(json) as BackupData;
}

// ── 현재 상태를 수동 스냅샷으로 저장 ─────────────────────────
// 현재 로컬 상태를 먼저 Drive에 올린 뒤 그 사본을 스냅샷으로 남긴다.
export async function createSnapshotNow(): Promise<void> {
    await exportToDrive();
    await createManualSnapshot();
}

// ── 로컬 데이터가 비어있는지 확인 (작품이 하나도 없으면 비어있음) ──
export async function isLocalDataEmpty(): Promise<boolean> {
    const projects = await projectOps.getAll();
    return projects.length === 0;
}

// ── Drive에 업로드 ────────────────────────────────────────────
export async function exportToDrive(): Promise<void> {
    const data = await collectLocalData();
    const json = JSON.stringify(data);
    const file = await findBackupFile();

    // 업로드 응답에서 새 modifiedTime을 직접 받아 추가 조회 없이 기록한다.
    let modifiedTime: string | null = null;
    if (file) {
        const res = await authFetch(
            `${UPLOAD_API}/files/${file.id}?uploadType=media&fields=modifiedTime`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: json,
            },
        );
        const meta = await res.json();
        modifiedTime = (meta.modifiedTime as string | undefined) ?? null;
    } else {
        modifiedTime = await uploadNewFile(DRIVE_FILE_NAME, json);
    }
    // 방금 올린 버전을 "마지막 동기화 버전"으로 기록 → stale 오탐 방지
    if (modifiedTime) saveLastSyncedModified(modifiedTime);
    // 다음 스냅샷의 본문은 지금 올린 이 내용이다 (스냅샷은 Drive 파일의 사본).
    // 요약 계산에 쓰려고 캐시해 둔다 — 실패해도 업로드 자체는 성공 처리한다.
    try {
        await writeDriveCacheJson("lastUploaded", json);
    } catch {
        // 캐시 실패 시 다음 스냅샷의 요약만 생략된다
    }
}

// ── 수동 스냅샷 생성 후 업로드 ───────────────────────────────
export async function exportToDriveWithSnapshot(): Promise<void> {
    await createManualSnapshot();
    await exportToDrive();
}

// ── Drive 백업 읽기 (적용 전 미리보기용) ─────────────────────
// 받기 전에 무엇이 바뀌는지 보여주려면 본문이 먼저 필요하다. 여기서 받은
// 결과를 그대로 importFromDrive에 넘기면 같은 파일을 두 번 내려받지 않는다.
export interface RemoteBackup {
    data: BackupData;
    modifiedTime: string;
}

export async function fetchRemoteBackup(): Promise<RemoteBackup> {
    const file = await findBackupFile();
    if (!file) throw new Error("Drive에 저장된 백업이 없습니다.");
    const res = await authFetch(`${DRIVE_API}/files/${file.id}?alt=media`);
    const data: BackupData = await res.json();
    return { data, modifiedTime: file.modifiedTime };
}

// ── Drive에서 다운로드 ────────────────────────────────────────
export async function importFromDrive(
    prefetched?: RemoteBackup,
): Promise<void> {
    const remote = prefetched ?? (await fetchRemoteBackup());
    await applyImportedData(remote.data);
    // 방금 받은 버전을 "마지막 동기화 버전"으로 기록 (추가 조회 불필요)
    saveLastSyncedModified(remote.modifiedTime);
}
