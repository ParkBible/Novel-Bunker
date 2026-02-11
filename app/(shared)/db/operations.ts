import {
    type Chapter,
    type Character,
    db,
    type Scene,
    type Setting,
} from "./index";

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
            for (const scene of scenesToShift) {
                if (scene.id !== undefined) {
                    await db.scenes.update(scene.id, {
                        order: scene.order + 1,
                        updatedAt: new Date(),
                    });
                }
            }
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
