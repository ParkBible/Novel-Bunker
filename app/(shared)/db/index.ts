import Dexie, { type EntityTable } from "dexie";

// Type definitions for database entities
export interface Chapter {
    id?: number;
    title: string;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Scene {
    id?: number;
    chapterId: number;
    title: string;
    content: string;
    order: number;
    characters: string[]; // Array of character IDs or names
    aiFeedback?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Character {
    id?: number;
    name: string;
    description: string;
    tags: string[];
}

export interface Setting {
    key: string;
    value: string;
}

// Database class
class NovelBunkerDB extends Dexie {
    chapters!: EntityTable<Chapter, "id">;
    scenes!: EntityTable<Scene, "id">;
    characters!: EntityTable<Character, "id">;
    settings!: EntityTable<Setting, "key">;

    constructor() {
        super("NovelBunkerDB");

        this.version(1).stores({
            chapters: "++id, order, createdAt",
            scenes: "++id, chapterId, order, [chapterId+order], createdAt",
            characters: "++id, name",
            settings: "key",
        });
    }
}

// Export singleton instance
export const db = new NovelBunkerDB();
