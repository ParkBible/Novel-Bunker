import Dexie, { type EntityTable } from "dexie";

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
    excerpt?: string; // 이 버전에서 새로 쓰인 첫 문장
}

// 스냅샷 본문. id는 Snapshot.id와 1:1로 맞춘다.
export interface SnapshotData {
    id: number;
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
                const snapshots = await tx.table("snapshots").toArray();
                for (const row of snapshots) {
                    const { data, ...meta } = row as Snapshot & {
                        data?: string;
                    };
                    if (typeof data !== "string" || row.id === undefined)
                        continue;
                    await tx.table("snapshotData").put({ id: row.id, data });
                    // put으로 통째로 덮어써 data 필드를 떨어뜨린다
                    await tx
                        .table("snapshots")
                        .put({ ...meta, size: data.length });
                }
            });
    }
}

// Export singleton instance
export const db = new NovelBunkerDB();
