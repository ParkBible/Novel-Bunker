import {
    type AiConversation,
    type AiMessage,
    type Chapter,
    type Character,
    type CharacterRelationship,
    db,
    type Lore,
    type Scene,
    type Setting,
} from "./index";

// AI Conversation Operations
export const aiConversationOps = {
    async getAll(): Promise<AiConversation[]> {
        return db.aiConversations.orderBy("createdAt").reverse().toArray();
    },

    async create(title: string): Promise<number> {
        const id = await db.aiConversations.add({
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

// Novel Operations
export const novelOps = {
    async updateNovelTitle(title: string): Promise<void> {
        await db.settings.put({ key: "novelTitle", value: title });
    },
};

// Chapter Operations
export const chapterOps = {
    async getAll(): Promise<Chapter[]> {
        return db.chapters.orderBy("order").toArray();
    },

    async create(title: string): Promise<number> {
        const maxOrder = await db.chapters.orderBy("order").last();
        const newOrder = maxOrder ? maxOrder.order + 1 : 0;

        const id = await db.chapters.add({
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
    async getAll(): Promise<Scene[]> {
        return db.scenes.orderBy("[chapterId+order]").toArray();
    },

    async getByChapter(chapterId: number): Promise<Scene[]> {
        return db.scenes.where("chapterId").equals(chapterId).sortBy("order");
    },

    async create(
        chapterId: number,
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
    async getAll(): Promise<Character[]> {
        return db.characters.toArray();
    },

    async create(
        name: string,
        description: string,
        tags: string[] = [],
    ): Promise<number> {
        const id = await db.characters.add({ name, description, tags });
        return id as number;
    },

    async update(id: number, updates: Partial<Character>): Promise<void> {
        await db.characters.update(id, updates);
    },

    async delete(id: number): Promise<void> {
        await db.characters.delete(id);
    },
};

// Relationship Operations
export const relationshipOps = {
    async getAll(): Promise<CharacterRelationship[]> {
        return db.characterRelationships.toArray();
    },

    async create(
        fromCharacterId: number,
        toCharacterId: number,
        label: string,
    ): Promise<number> {
        const id = await db.characterRelationships.add({
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
    async getAll(): Promise<Lore[]> {
        return db.lores.orderBy("createdAt").toArray();
    },

    async getByCategory(category: string): Promise<Lore[]> {
        return db.lores.where("category").equals(category).toArray();
    },

    async create(
        name: string,
        category: string,
        description = "",
    ): Promise<number> {
        const id = await db.lores.add({
            name,
            category,
            description,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        return id as number;
    },

    async update(id: number, updates: Partial<Lore>): Promise<void> {
        await db.lores.update(id, { ...updates, updatedAt: new Date() });
    },

    async delete(id: number): Promise<void> {
        await db.lores.delete(id);
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
