import Dexie, { type EntityTable } from "dexie";

// Type definitions for database entities
export interface Chapter {
    id?: number;
    title: string;
    order: number;
    memo?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Scene {
    id?: number;
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
    name: string;
    description: string;
    tags: string[];
    age?: string;
    gender?: string;
    role?: string;
    mbti?: string;
    appearance?: string;
    personality?: string;
}

export interface CharacterRelationship {
    id?: number;
    fromCharacterId: number;
    toCharacterId: number;
    label: string;
}

export interface Lore {
    id?: number;
    name: string;
    category: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
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
    characterRelationships!: EntityTable<CharacterRelationship, "id">;
    lores!: EntityTable<Lore, "id">;
    settings!: EntityTable<Setting, "key">;

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
    }
}

// Export singleton instance
export const db = new NovelBunkerDB();
