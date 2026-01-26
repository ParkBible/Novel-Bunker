import { db, type Chapter, type Scene, type Character, type Setting } from './index';

// Chapter Operations
export const chapterOps = {
  async getAll(): Promise<Chapter[]> {
    return db.chapters.orderBy('order').toArray();
  },

  async create(title: string): Promise<number> {
    const maxOrder = await db.chapters.orderBy('order').last();
    const newOrder = maxOrder ? maxOrder.order + 1 : 0;
    
    const id = await db.chapters.add({
      title,
      order: newOrder,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return id as number;
  },

  async update(id: number, updates: Partial<Chapter>): Promise<void> {
    await db.chapters.update(id, { ...updates, updatedAt: new Date() });
  },

  async delete(id: number): Promise<void> {
    // Delete all scenes in this chapter first
    const scenes = await db.scenes.where('chapterId').equals(id).toArray();
    await db.scenes.bulkDelete(scenes.map(s => s.id!));
    await db.chapters.delete(id);
  },

  async reorder(id: number, newOrder: number): Promise<void> {
    await db.chapters.update(id, { order: newOrder, updatedAt: new Date() });
  }
};

// Scene Operations
export const sceneOps = {
  async getAll(): Promise<Scene[]> {
    return db.scenes.orderBy('[chapterId+order]').toArray();
  },

  async getByChapter(chapterId: number): Promise<Scene[]> {
    return db.scenes.where('chapterId').equals(chapterId).sortBy('order');
  },

  async create(chapterId: number, title: string, order?: number): Promise<number> {
    let sceneOrder = order;
    
    if (sceneOrder === undefined) {
      const scenes = await db.scenes.where('chapterId').equals(chapterId).toArray();
      sceneOrder = scenes.length > 0 ? Math.max(...scenes.map(s => s.order)) + 1 : 0;
    }

    const id = await db.scenes.add({
      chapterId,
      title,
      content: '',
      order: sceneOrder,
      characters: [],
      createdAt: new Date(),
      updatedAt: new Date()
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
  }
};

// Character Operations
export const characterOps = {
  async getAll(): Promise<Character[]> {
    return db.characters.toArray();
  },

  async create(name: string, description: string, tags: string[] = []): Promise<number> {
    const id = await db.characters.add({ name, description, tags });
    return id as number;
  },

  async update(id: number, updates: Partial<Character>): Promise<void> {
    await db.characters.update(id, updates);
  },

  async delete(id: number): Promise<void> {
    await db.characters.delete(id);
  }
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
  }
};
