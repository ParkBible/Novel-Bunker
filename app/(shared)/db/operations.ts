import {
    type AiConversation,
    type AiMessage,
    type Chapter,
    type Character,
    type CharacterMessage,
    type CharacterRelationship,
    db,
    type Lore,
    type Project,
    type Scene,
    type Setting,
} from "./index";

const DEFAULT_LORE_CATEGORIES = ["세계관", "장소", "아이템"];
const DEFAULT_CHARACTER_GROUPS = ["주인공", "조연", "기타"];

// Project Operations
export const projectOps = {
    async getAll(): Promise<Project[]> {
        return db.projects.orderBy("order").toArray();
    },

    async get(id: number): Promise<Project | undefined> {
        return db.projects.get(id);
    },

    // 새 작품 생성 — 기본 챕터 1개까지 만들어 에디터 즉시 진입을 보장
    async create(
        title: string,
    ): Promise<{ projectId: number; firstChapterId: number }> {
        const last = await db.projects.orderBy("order").last();
        const order = last ? last.order + 1 : 0;
        const now = new Date();
        const projectId = (await db.projects.add({
            title,
            synopsis: "",
            loreCategories: [...DEFAULT_LORE_CATEGORIES],
            characterGroups: [...DEFAULT_CHARACTER_GROUPS],
            order,
            createdAt: now,
            updatedAt: now,
        })) as number;

        const firstChapterId = await chapterOps.create(projectId, "1장");
        return { projectId, firstChapterId };
    },

    async update(id: number, updates: Partial<Project>): Promise<void> {
        await db.projects.update(id, { ...updates, updatedAt: new Date() });
    },

    // 갤러리 카드용 가벼운 통계 (챕터/씬 개수, 글자 수)
    async getStats(
        id: number,
    ): Promise<{ chapters: number; scenes: number; chars: number }> {
        const [chapters, scenes] = await Promise.all([
            db.chapters.where("projectId").equals(id).count(),
            db.scenes.where("projectId").equals(id).toArray(),
        ]);
        const chars = scenes.reduce(
            (sum, s) => sum + (s.content?.replace(/<[^>]*>/g, "").length ?? 0),
            0,
        );
        return { chapters, scenes: scenes.length, chars };
    },

    async reorder(id: number, order: number): Promise<void> {
        await db.projects.update(id, { order, updatedAt: new Date() });
    },

    // 작품과 그 하위 데이터 전체를 연쇄 삭제
    async delete(id: number): Promise<void> {
        const characters = await db.characters
            .where("projectId")
            .equals(id)
            .toArray();
        const characterIds = characters
            .map((c) => c.id)
            .filter((cid): cid is number => cid !== undefined);

        const conversations = await db.aiConversations
            .where("projectId")
            .equals(id)
            .toArray();
        const conversationIds = conversations
            .map((c) => c.id)
            .filter((cid): cid is number => cid !== undefined);

        await db.transaction(
            "rw",
            [
                db.projects,
                db.chapters,
                db.scenes,
                db.characters,
                db.characterRelationships,
                db.lores,
                db.aiConversations,
                db.aiMessages,
                db.characterMessages,
            ],
            async () => {
                await db.chapters.where("projectId").equals(id).delete();
                await db.scenes.where("projectId").equals(id).delete();
                await db.characters.where("projectId").equals(id).delete();
                await db.characterRelationships
                    .where("projectId")
                    .equals(id)
                    .delete();
                await db.lores.where("projectId").equals(id).delete();
                if (conversationIds.length > 0) {
                    await db.aiMessages
                        .where("conversationId")
                        .anyOf(conversationIds)
                        .delete();
                }
                await db.aiConversations.where("projectId").equals(id).delete();
                if (characterIds.length > 0) {
                    await db.characterMessages
                        .where("characterId")
                        .anyOf(characterIds)
                        .delete();
                }
                await db.projects.delete(id);
            },
        );
    },
};

// AI Conversation Operations
export const aiConversationOps = {
    async getAll(projectId: number): Promise<AiConversation[]> {
        const list = await db.aiConversations
            .where("projectId")
            .equals(projectId)
            .sortBy("createdAt");
        return list.reverse(); // 최신순
    },

    async create(projectId: number, title: string): Promise<number> {
        const id = await db.aiConversations.add({
            projectId,
            title,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        return id as number;
    },

    async updateTitle(id: number, title: string): Promise<void> {
        await db.aiConversations.update(id, { title, updatedAt: new Date() });
    },

    async delete(id: number): Promise<void> {
        await db.aiMessages.where("conversationId").equals(id).delete();
        await db.aiConversations.delete(id);
    },
};

// AI Message Operations
export const aiMessageOps = {
    async getByConversation(conversationId: number): Promise<AiMessage[]> {
        return db.aiMessages
            .where("conversationId")
            .equals(conversationId)
            .sortBy("createdAt");
    },

    async create(
        conversationId: number,
        role: "user" | "model",
        text: string,
        context?: {
            contextType: "scene" | "chapter";
            contextId: number;
            contextTitle: string;
            contextContent: string;
        },
    ): Promise<number> {
        const id = await db.aiMessages.add({
            conversationId,
            role,
            text,
            ...context,
            createdAt: new Date(),
        });
        return id as number;
    },
};

// Chapter Operations
export const chapterOps = {
    async getAll(projectId: number): Promise<Chapter[]> {
        return db.chapters.where("projectId").equals(projectId).sortBy("order");
    },

    async getProjectId(chapterId: number): Promise<number | undefined> {
        const chapter = await db.chapters.get(chapterId);
        return chapter?.projectId;
    },

    async create(projectId: number, title: string): Promise<number> {
        const chapters = await db.chapters
            .where("projectId")
            .equals(projectId)
            .toArray();
        const newOrder =
            chapters.length > 0
                ? Math.max(...chapters.map((c) => c.order)) + 1
                : 0;

        const id = await db.chapters.add({
            projectId,
            title,
            order: newOrder,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        return id as number;
    },

    async update(id: number, updates: Partial<Chapter>): Promise<void> {
        await db.chapters.update(id, { ...updates, updatedAt: new Date() });
    },

    async delete(id: number): Promise<void> {
        // Delete all scenes in this chapter first
        const scenes = await db.scenes.where("chapterId").equals(id).toArray();
        const sceneIds = scenes
            .map((s) => s.id)
            .filter((id): id is number => id !== undefined);
        await db.scenes.bulkDelete(sceneIds);
        await db.chapters.delete(id);
    },

    async reorder(id: number, newOrder: number): Promise<void> {
        await db.chapters.update(id, {
            order: newOrder,
            updatedAt: new Date(),
        });
    },
};

// Scene Operations
export const sceneOps = {
    async getAll(projectId: number): Promise<Scene[]> {
        const scenes = await db.scenes
            .where("projectId")
            .equals(projectId)
            .toArray();
        return scenes.sort(
            (a, b) => a.chapterId - b.chapterId || a.order - b.order,
        );
    },

    async getByChapter(chapterId: number): Promise<Scene[]> {
        return db.scenes.where("chapterId").equals(chapterId).sortBy("order");
    },

    async create(
        chapterId: number,
        projectId: number,
        title: string,
        insertAtOrder?: number,
    ): Promise<number> {
        const scenes = await db.scenes
            .where("chapterId")
            .equals(chapterId)
            .toArray();

        let sceneOrder: number;

        if (insertAtOrder === undefined) {
            // 맨 뒤에 추가
            sceneOrder =
                scenes.length > 0
                    ? Math.max(...scenes.map((s) => s.order)) + 1
                    : 0;
        } else {
            // 특정 위치에 삽입 - 기존 씬들의 order를 밀어줌
            sceneOrder = insertAtOrder;

            const scenesToShift = scenes.filter(
                (s) => s.order >= insertAtOrder,
            );

            const updates = scenesToShift
                .filter((s) => s.id !== undefined)
                .map((s) => ({
                    key: s.id,
                    changes: {
                        order: s.order + 1,
                        updatedAt: new Date(),
                    },
                }));

            if (updates.length > 0) await db.scenes.bulkUpdate(updates);
        }

        const id = await db.scenes.add({
            projectId,
            chapterId,
            title,
            content: "",
            order: sceneOrder,
            characters: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        return id as number;
    },

    async update(id: number, updates: Partial<Scene>): Promise<void> {
        await db.scenes.update(id, { ...updates, updatedAt: new Date() });
    },

    async updateContent(id: number, content: string): Promise<void> {
        await db.scenes.update(id, { content, updatedAt: new Date() });
    },

    async delete(id: number): Promise<void> {
        await db.scenes.delete(id);
    },

    async reorder(id: number, newOrder: number): Promise<void> {
        await db.scenes.update(id, { order: newOrder, updatedAt: new Date() });
    },
};

// Character Operations
export const characterOps = {
    async getAll(projectId: number): Promise<Character[]> {
        return db.characters.where("projectId").equals(projectId).toArray();
    },

    async create(
        projectId: number,
        name: string,
        description: string,
        tags: string[] = [],
        order = 0,
        group = "주인공",
    ): Promise<number> {
        const id = await db.characters.add({
            projectId,
            name,
            description,
            tags,
            order,
            group,
        });
        return id as number;
    },

    async update(id: number, updates: Partial<Character>): Promise<void> {
        await db.characters.update(id, updates);
    },

    async reorder(id: number, order: number): Promise<void> {
        await db.characters.update(id, { order });
    },

    async delete(id: number): Promise<void> {
        await db.characters.delete(id);
    },
};

// Relationship Operations
export const relationshipOps = {
    async getAll(projectId: number): Promise<CharacterRelationship[]> {
        return db.characterRelationships
            .where("projectId")
            .equals(projectId)
            .toArray();
    },

    async create(
        projectId: number,
        fromCharacterId: number,
        toCharacterId: number,
        label: string,
    ): Promise<number> {
        const id = await db.characterRelationships.add({
            projectId,
            fromCharacterId,
            toCharacterId,
            label,
        });
        return id as number;
    },

    async update(
        id: number,
        updates: Partial<CharacterRelationship>,
    ): Promise<void> {
        await db.characterRelationships.update(id, updates);
    },

    async delete(id: number): Promise<void> {
        await db.characterRelationships.delete(id);
    },
};

// Lore Operations
export const loreOps = {
    async getAll(projectId: number): Promise<Lore[]> {
        return db.lores.where("projectId").equals(projectId).sortBy("order");
    },

    async getByCategory(category: string): Promise<Lore[]> {
        return db.lores.where("category").equals(category).sortBy("order");
    },

    async create(
        projectId: number,
        name: string,
        category: string,
        description = "",
    ): Promise<{ id: number; order: number }> {
        const lores = await db.lores
            .where("projectId")
            .equals(projectId)
            .toArray();
        const order =
            lores.length > 0 ? Math.max(...lores.map((l) => l.order)) + 1 : 0;
        const id = await db.lores.add({
            projectId,
            name,
            category,
            description,
            order,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        return { id: id as number, order };
    },

    async update(id: number, updates: Partial<Lore>): Promise<void> {
        await db.lores.update(id, { ...updates, updatedAt: new Date() });
    },

    async delete(id: number): Promise<void> {
        await db.lores.delete(id);
    },

    async reorder(id: number, newOrder: number): Promise<void> {
        await db.lores.update(id, { order: newOrder });
    },
};

// Character Message Operations
export const characterMessageOps = {
    async getByCharacter(characterId: number): Promise<CharacterMessage[]> {
        return db.characterMessages
            .where("characterId")
            .equals(characterId)
            .sortBy("createdAt");
    },

    async create(
        characterId: number,
        role: "user" | "model",
        text: string,
    ): Promise<number> {
        const id = await db.characterMessages.add({
            characterId,
            role,
            text,
            createdAt: new Date(),
        });
        return id as number;
    },

    async clearByCharacter(characterId: number): Promise<void> {
        await db.characterMessages
            .where("characterId")
            .equals(characterId)
            .delete();
    },
};

// Settings Operations
export const settingsOps = {
    async get(key: string): Promise<string | undefined> {
        const setting = await db.settings.get(key);
        return setting?.value;
    },

    async set(key: string, value: string): Promise<void> {
        await db.settings.put({ key, value });
    },

    async getAll(): Promise<Setting[]> {
        return db.settings.toArray();
    },
};
