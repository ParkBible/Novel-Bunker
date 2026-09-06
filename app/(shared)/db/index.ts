import Dexie, { type EntityTable, type Transaction } from "dexie";
import type { BackupData } from "./backup";
import { computeStats } from "./snapshotStats";

// Type definitions for database entities

// 작품(프로젝트) — 챕터/씬/인물/설정집/관계/AI대화의 최상위 소속 단위
export interface Project {
    id?: number;
    title: string;
    synopsis: string;
    loreCategories: string[];
    characterGroups: string[];
    order: number;
    coverColor?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface AiConversation {
    id?: number;
    projectId: number;
    title: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface AiMessage {
    id?: number;
    conversationId: number;
    role: "user" | "model";
    text: string;
    contextType?: "scene" | "chapter";
    contextId?: number;
    contextTitle?: string;
    contextContent?: string;
    createdAt: Date;
}

export interface Chapter {
    id?: number;
    projectId: number;
    title: string;
    order: number;
    memo?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Scene {
    id?: number;
    projectId: number;
    chapterId: number;
    title: string;
    content: string;
    order: number;
    memo?: string;
    characters: string[]; // Array of character IDs or names
    aiFeedback?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Character {
    id?: number;
    projectId: number;
    name: string;
    description: string;
    tags: string[];
    order: number;
    group: string;
    age?: string;
    gender?: string;
    role?: string;
    mbti?: string;
    appearance?: string;
    personality?: string;
}

export interface CharacterRelationship {
    id?: number;
    projectId: number;
    fromCharacterId: number;
    toCharacterId: number;
    label: string;
}

export interface Lore {
    id?: number;
    projectId: number;
    name: string;
    category: string;
    description: string;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Setting {
    key: string;
    value: string;
}

export interface CharacterMessage {
    id?: number;
    characterId: number;
    role: "user" | "model";
    text: string;
    createdAt: Date;
}

// 로컬 버전 히스토리 스냅샷의 메타데이터.
// 본문(JSON)은 snapshotData 테이블에 따로 둔다 — IndexedDB는 레코드 일부만
// 읽을 수 없어서, 한 테이블에 두면 목록을 그릴 때마다 전체 본문이 딸려 온다.
export interface Snapshot {
    id?: number;
    createdAt: Date;
    type: "manual" | "auto";
    label?: string;
    size?: number; // 본문 길이 (진단용)
    // 타임라인 표시용 요약. 저장 시점에 계산해 둔다. (구버전 레코드엔 없음)
    chars?: number; // 본문 총 글자 수
    added?: number; // 직전 스냅샷 대비 늘어난 글자 수
    removed?: number; // 직전 스냅샷 대비 줄어든 글자 수
    scenesChanged?: number; // 직전 스냅샷 대비 바뀐 씬 개수
    changedScenes?: string[]; // 바뀐 씬 이름 (앞의 몇 개만)
}

// 스냅샷 본문. id는 Snapshot.id와 1:1로 맞춘다.
export interface SnapshotData {
    id: number;
    data: string; // JSON.stringify(BackupData)
}

/**
 * Drive 스냅샷의 요약값(글자 증감·바뀐 씬)을 계산하기 위한 캐시.
 * Drive 스냅샷은 서버 측 파일 복사로 만들어져 본문이 로컬에 없으므로,
 * 요약을 계산하려면 두 가지 상태가 필요하다.
 *   - lastUploaded: 마지막으로 Drive에 올린 내용 (= 새 스냅샷의 본문)
 *   - baseline: 직전 Drive 스냅샷의 본문 (= 비교 기준)
 * 이 캐시가 있어 스냅샷을 만들 때 Drive에서 본문을 다시 내려받지 않는다.
 */
export interface DriveCacheRow {
    key: "lastUploaded" | "baseline";
    data: string; // JSON.stringify(BackupData)
}

// Database class
class NovelBunkerDB extends Dexie {
    projects!: EntityTable<Project, "id">;
    chapters!: EntityTable<Chapter, "id">;
    scenes!: EntityTable<Scene, "id">;
    characters!: EntityTable<Character, "id">;
    characterRelationships!: EntityTable<CharacterRelationship, "id">;
    lores!: EntityTable<Lore, "id">;
    settings!: EntityTable<Setting, "key">;
    aiConversations!: EntityTable<AiConversation, "id">;
    aiMessages!: EntityTable<AiMessage, "id">;
    characterMessages!: EntityTable<CharacterMessage, "id">;
    snapshots!: EntityTable<Snapshot, "id">;
    snapshotData!: EntityTable<SnapshotData, "id">;
    driveCache!: EntityTable<DriveCacheRow, "key">;

    constructor() {
        super("NovelBunkerDB");

        this.version(1).stores({
            chapters: "++id, order, createdAt",
            scenes: "++id, chapterId, order, [chapterId+order], createdAt",
            characters: "++id, name",
            settings: "key",
        });

        this.version(2).stores({
            chapters: "++id, order, createdAt",
            scenes: "++id, chapterId, order, [chapterId+order], createdAt",
            characters: "++id, name",
            characterRelationships: "++id, fromCharacterId, toCharacterId",
            settings: "key",
        });

        this.version(3).stores({
            chapters: "++id, order, createdAt",
            scenes: "++id, chapterId, order, [chapterId+order], createdAt",
            characters: "++id, name",
            characterRelationships: "++id, fromCharacterId, toCharacterId",
            lores: "++id, category, createdAt",
            settings: "key",
        });

        this.version(4).stores({
            chapters: "++id, order, createdAt",
            scenes: "++id, chapterId, order, [chapterId+order], createdAt",
            characters: "++id, name",
            characterRelationships: "++id, fromCharacterId, toCharacterId",
            lores: "++id, category, createdAt",
            settings: "key",
            aiConversations: "++id, createdAt",
            aiMessages: "++id, conversationId, createdAt",
        });

        this.version(5)
            .stores({
                chapters: "++id, order, createdAt",
                scenes: "++id, chapterId, order, [chapterId+order], createdAt",
                characters: "++id, name, order",
                characterRelationships: "++id, fromCharacterId, toCharacterId",
                lores: "++id, category, createdAt",
                settings: "key",
                aiConversations: "++id, createdAt",
                aiMessages: "++id, conversationId, createdAt",
            })
            .upgrade(async (tx) => {
                const chars = await tx.table("characters").toArray();
                await Promise.all(
                    chars.map((c, i) =>
                        tx.table("characters").update(c.id, { order: i }),
                    ),
                );
            });

        this.version(6)
            .stores({
                chapters: "++id, order, createdAt",
                scenes: "++id, chapterId, order, [chapterId+order], createdAt",
                characters: "++id, name, order, group",
                characterRelationships: "++id, fromCharacterId, toCharacterId",
                lores: "++id, category, createdAt",
                settings: "key",
                aiConversations: "++id, createdAt",
                aiMessages: "++id, conversationId, createdAt",
            })
            .upgrade(async (tx) => {
                await tx
                    .table("characters")
                    .toCollection()
                    .modify({ group: "주인공" });
            });

        this.version(7).stores({
            chapters: "++id, order, createdAt",
            scenes: "++id, chapterId, order, [chapterId+order], createdAt",
            characters: "++id, name, order, group",
            characterRelationships: "++id, fromCharacterId, toCharacterId",
            lores: "++id, category, createdAt",
            settings: "key",
            aiConversations: "++id, createdAt",
            aiMessages: "++id, conversationId, createdAt",
            characterMessages: "++id, characterId, createdAt",
        });

        this.version(8)
            .stores({
                chapters: "++id, order, createdAt",
                scenes: "++id, chapterId, order, [chapterId+order], createdAt",
                characters: "++id, name, order, group",
                characterRelationships: "++id, fromCharacterId, toCharacterId",
                lores: "++id, category, order, createdAt",
                settings: "key",
                aiConversations: "++id, createdAt",
                aiMessages: "++id, conversationId, createdAt",
                characterMessages: "++id, characterId, createdAt",
            })
            .upgrade(async (tx) => {
                const lores = await tx
                    .table("lores")
                    .orderBy("createdAt")
                    .toArray();
                await Promise.all(
                    lores.map((l, i) =>
                        tx.table("lores").update(l.id, { order: i }),
                    ),
                );
            });

        this.version(9).stores({
            chapters: "++id, order, createdAt",
            scenes: "++id, chapterId, order, [chapterId+order], createdAt",
            characters: "++id, name, order, group",
            characterRelationships: "++id, fromCharacterId, toCharacterId",
            lores: "++id, category, order, createdAt",
            settings: "key",
            aiConversations: "++id, createdAt",
            aiMessages: "++id, conversationId, createdAt",
            characterMessages: "++id, characterId, createdAt",
            snapshots: "++id, createdAt, type",
        });

        // v10: 멀티 프로젝트 도입. 모든 콘텐츠를 projects에 소속시킨다.
        this.version(10)
            .stores({
                projects: "++id, order, createdAt",
                chapters:
                    "++id, projectId, [projectId+order], order, createdAt",
                scenes: "++id, chapterId, projectId, [chapterId+order], order, createdAt",
                characters: "++id, projectId, name, order, group",
                characterRelationships:
                    "++id, projectId, fromCharacterId, toCharacterId",
                lores: "++id, projectId, category, order, createdAt",
                settings: "key",
                aiConversations: "++id, projectId, createdAt",
                aiMessages: "++id, conversationId, createdAt",
                characterMessages: "++id, characterId, createdAt",
                snapshots: "++id, createdAt, type",
            })
            .upgrade(async (tx) => {
                // 기존 단일 작품 설정을 읽어 기본 작품 1개로 편입
                const settingsTable = tx.table("settings");
                const getSetting = async (key: string) => {
                    const row = await settingsTable.get(key);
                    return row?.value as string | undefined;
                };
                const parseArray = (
                    raw: string | undefined,
                    fallback: string[],
                ): string[] => {
                    if (!raw) return fallback;
                    try {
                        const parsed = JSON.parse(raw);
                        return Array.isArray(parsed) ? parsed : fallback;
                    } catch {
                        return fallback;
                    }
                };

                const now = new Date();
                const projectId = (await tx.table("projects").add({
                    title: (await getSetting("novelTitle")) || "제목 없는 작품",
                    synopsis: (await getSetting("synopsis")) || "",
                    loreCategories: parseArray(
                        await getSetting("loreCategories"),
                        ["세계관", "장소", "아이템"],
                    ),
                    characterGroups: parseArray(
                        await getSetting("characterGroups"),
                        ["주인공", "조연", "기타"],
                    ),
                    order: 0,
                    createdAt: now,
                    updatedAt: now,
                })) as number;

                // 기존 콘텐츠 전 레코드에 projectId 부여
                for (const table of [
                    "chapters",
                    "scenes",
                    "characters",
                    "characterRelationships",
                    "lores",
                    "aiConversations",
                ]) {
                    await tx.table(table).toCollection().modify({ projectId });
                }

                // 작품으로 이관된 전역 키 정리, 활성 작품 지정
                await settingsTable.bulkDelete([
                    "novelTitle",
                    "synopsis",
                    "loreCategories",
                    "characterGroups",
                ]);
                await settingsTable.put({
                    key: "activeProjectId",
                    value: String(projectId),
                });
            });

        // v11: 스냅샷 본문을 별도 테이블로 분리. 버전 목록을 그릴 때
        // 본문까지 읽어 올리던 비용을 없앤다.
        this.version(11)
            .stores({
                projects: "++id, order, createdAt",
                chapters:
                    "++id, projectId, [projectId+order], order, createdAt",
                scenes: "++id, chapterId, projectId, [chapterId+order], order, createdAt",
                characters: "++id, projectId, name, order, group",
                characterRelationships:
                    "++id, projectId, fromCharacterId, toCharacterId",
                lores: "++id, projectId, category, order, createdAt",
                settings: "key",
                aiConversations: "++id, projectId, createdAt",
                aiMessages: "++id, conversationId, createdAt",
                characterMessages: "++id, characterId, createdAt",
                snapshots: "++id, createdAt, type",
                snapshotData: "id",
            })
            .upgrade(async (tx) => {
                // 본문을 이미 손에 들고 있으므로, 옮기는 김에 타임라인 요약값
                // (글자 증감·바뀐 씬 수·발췌)도 함께 채운다. 오래된 것부터
                // 훑으면서 직전 버전과 비교한다.
                const snapshots = (await tx.table("snapshots").toArray()).sort(
                    (a, b) =>
                        new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime(),
                );

                let prev: BackupData | null = null;
                for (const row of snapshots) {
                    const { data, ...meta } = row as Snapshot & {
                        data?: string;
                    };
                    if (typeof data !== "string" || row.id === undefined)
                        continue;

                    let stats: Partial<Snapshot> = {};
                    try {
                        const parsed = JSON.parse(data) as BackupData;
                        stats = computeStats(parsed, prev);
                        prev = parsed;
                    } catch {
                        // 깨진 스냅샷이 있어도 이관 자체는 멈추지 않는다
                        prev = null;
                    }

                    await tx.table("snapshotData").put({ id: row.id, data });
                    // put으로 통째로 덮어써 data 필드를 떨어뜨린다
                    await tx
                        .table("snapshots")
                        .put({ ...meta, ...stats, size: data.length });
                }
            });

        // v12, v13: 요약값이 비어 있는 스냅샷을 채우는 보충 단계.
        // 요약 항목이 바뀔 때마다 버전을 올리면 이미 업그레이드된 DB도 따라온다.
        // (Dexie는 같은 버전의 upgrade를 두 번 실행하지 않는다)
        this.version(12).upgrade(backfillSnapshotSummaries);
        this.version(13).upgrade(backfillSnapshotSummaries);

        // v14: Drive 스냅샷 요약 계산용 캐시 테이블 추가. 기존 데이터는 손대지
        // 않으며, 캐시가 채워지기 전(첫 업로드 전)에는 요약을 생략한다.
        this.version(14).stores({ driveCache: "key" });
    }
}

// 요약값이 없는 스냅샷만 골라 본문을 읽어 채운다. 이미 채워진 건 건드리지
// 않으므로 여러 버전에서 반복 호출해도 안전하다.
async function backfillSnapshotSummaries(
    tx: Transaction & { table: Dexie["table"] },
): Promise<void> {
    const snapshots = (await tx.table("snapshots").toArray()).sort(
        (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const needsFill = (s: Snapshot) =>
        s.added === undefined || s.changedScenes === undefined;
    if (!snapshots.some(needsFill)) return;

    let prev: BackupData | null = null;
    for (const row of snapshots) {
        if (row.id === undefined) continue;
        const body = await tx.table("snapshotData").get(row.id);
        if (!body) continue;

        try {
            const parsed = JSON.parse(body.data) as BackupData;
            if (needsFill(row)) {
                await tx
                    .table("snapshots")
                    .update(row.id, computeStats(parsed, prev));
            }
            prev = parsed;
        } catch {
            // 깨진 스냅샷이 있어도 나머지 백필은 계속한다
            prev = null;
        }
    }
}

// Export singleton instance
export const db = new NovelBunkerDB();
