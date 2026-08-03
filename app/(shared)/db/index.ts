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

// 로컬 버전 히스토리 스냅샷 (프로젝트 전체를 JSON 문자열로 보관)
export interface Snapshot {
    id?: number;
    createdAt: Date;
    type: "manual" | "auto";
    label?: string;
    // JSON.stringify(BackupData) — 용량/직렬화 단순화를 위해 문자열로 저장
    data: string;
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
    }
}

// Export singleton instance
export const db = new NovelBunkerDB();
