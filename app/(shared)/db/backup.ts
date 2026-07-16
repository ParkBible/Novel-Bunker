import type {
    AiConversation,
    AiMessage,
    Chapter,
    Character,
    CharacterMessage,
    CharacterRelationship,
    Lore,
    Scene,
    Setting,
} from ".";
import { db } from ".";
import {
    aiConversationOps,
    chapterOps,
    characterOps,
    loreOps,
    relationshipOps,
    sceneOps,
    settingsOps,
} from "./operations";

// 프로젝트 전체 백업 데이터 (Drive 파일 / 로컬 스냅샷 공용 포맷)
export interface BackupData {
    version: number;
    exportedAt: string;
    chapters: Chapter[];
    scenes: Scene[];
    characters: Character[];
    characterRelationships: CharacterRelationship[];
    lores: Lore[];
    settings: Setting[];
    aiConversations: AiConversation[];
    aiMessages: AiMessage[];
    // 하위 호환: 구버전 백업에는 없을 수 있어 선택적 필드
    characterMessages?: CharacterMessage[];
}

// ── 로컬 데이터 전체 수집 ─────────────────────────────────────
export async function collectLocalData(): Promise<BackupData> {
    const [
        chapters,
        scenes,
        characters,
        characterRelationships,
        lores,
        settings,
        aiConversations,
        aiMessages,
        characterMessages,
    ] = await Promise.all([
        chapterOps.getAll(),
        sceneOps.getAll(),
        characterOps.getAll(),
        relationshipOps.getAll(),
        loreOps.getAll(),
        settingsOps.getAll(),
        aiConversationOps.getAll(),
        db.aiMessages.toArray(),
        db.characterMessages.toArray(),
    ]);

    return {
        version: 2,
        exportedAt: new Date().toISOString(),
        chapters,
        scenes,
        characters,
        characterRelationships,
        lores,
        settings,
        aiConversations,
        aiMessages,
        characterMessages,
    };
}

// ── 백업 데이터를 로컬 DB에 복원 (전체 덮어쓰기) ─────────────
export async function applyImportedData(data: BackupData): Promise<void> {
    const toDate = (v: unknown): Date =>
        v instanceof Date ? v : new Date(v as string);

    const chapters = data.chapters.map((c) => ({
        ...c,
        createdAt: toDate(c.createdAt),
        updatedAt: toDate(c.updatedAt),
    }));
    const scenes = data.scenes.map((s) => ({
        ...s,
        createdAt: toDate(s.createdAt),
        updatedAt: toDate(s.updatedAt),
    }));
    const lores = data.lores.map((l) => ({
        ...l,
        createdAt: toDate(l.createdAt),
        updatedAt: toDate(l.updatedAt),
    }));

    const aiConversations = (data.aiConversations ?? []).map((c) => ({
        ...c,
        createdAt: toDate(c.createdAt),
        updatedAt: toDate(c.updatedAt),
    }));
    const aiMessages = (data.aiMessages ?? []).map((m) => ({
        ...m,
        createdAt: toDate(m.createdAt),
    }));
    const characterMessages = (data.characterMessages ?? []).map((m) => ({
        ...m,
        createdAt: toDate(m.createdAt),
    }));

    await db.transaction(
        "rw",
        [
            db.chapters,
            db.scenes,
            db.characters,
            db.characterRelationships,
            db.lores,
            db.settings,
            db.aiConversations,
            db.aiMessages,
            db.characterMessages,
        ],
        async () => {
            await db.chapters.clear();
            await db.scenes.clear();
            await db.characters.clear();
            await db.characterRelationships.clear();
            await db.lores.clear();
            await db.settings.clear();
            await db.aiConversations.clear();
            await db.aiMessages.clear();
            await db.characterMessages.clear();

            await db.chapters.bulkAdd(chapters);
            await db.scenes.bulkAdd(scenes);
            await db.characters.bulkAdd(data.characters);
            await db.characterRelationships.bulkAdd(
                data.characterRelationships,
            );
            await db.lores.bulkAdd(lores);
            await db.settings.bulkAdd(data.settings);
            if (aiConversations.length > 0)
                await db.aiConversations.bulkAdd(aiConversations);
            if (aiMessages.length > 0) await db.aiMessages.bulkAdd(aiMessages);
            if (characterMessages.length > 0)
                await db.characterMessages.bulkAdd(characterMessages);
        },
    );
}
