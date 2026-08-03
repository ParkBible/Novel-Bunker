import type {
    AiConversation,
    AiMessage,
    Chapter,
    Character,
    CharacterMessage,
    CharacterRelationship,
    Lore,
    Project,
    Scene,
    Setting,
} from ".";
import { db } from ".";
import { settingsOps } from "./operations";

// 프로젝트 전체 백업 데이터 (Drive 파일 / 로컬 스냅샷 공용 포맷)
export interface BackupData {
    version: number;
    exportedAt: string;
    // 멀티 작품: v3부터. 구버전 백업엔 없을 수 있어 선택적 필드
    projects?: Project[];
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

// ── 로컬 데이터 전체 수집 (모든 작품 포함, DB 전체) ──────────────
export async function collectLocalData(): Promise<BackupData> {
    const [
        projects,
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
        db.projects.toArray(),
        db.chapters.toArray(),
        db.scenes.toArray(),
        db.characters.toArray(),
        db.characterRelationships.toArray(),
        db.lores.toArray(),
        settingsOps.getAll(),
        db.aiConversations.toArray(),
        db.aiMessages.toArray(),
        db.characterMessages.toArray(),
    ]);

    return {
        version: 3,
        exportedAt: new Date().toISOString(),
        projects,
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

    // 구버전(v2 이하) 백업은 projects가 없다 → 기본 작품 1개로 편입
    const legacyProjectId = 1;
    const legacy = !data.projects || data.projects.length === 0;
    const projects: Project[] = legacy
        ? [
              {
                  id: legacyProjectId,
                  title:
                      data.settings?.find((s) => s.key === "novelTitle")
                          ?.value || "제목 없는 작품",
                  synopsis:
                      data.settings?.find((s) => s.key === "synopsis")?.value ||
                      "",
                  loreCategories: ["세계관", "장소", "아이템"],
                  characterGroups: ["주인공", "조연", "기타"],
                  order: 0,
                  createdAt: new Date(),
                  updatedAt: new Date(),
              },
          ]
        : (data.projects as Project[]).map((p) => ({
              ...p,
              createdAt: toDate(p.createdAt),
              updatedAt: toDate(p.updatedAt),
          }));

    const withProject = <T extends { projectId?: number }>(item: T): T =>
        legacy ? { ...item, projectId: legacyProjectId } : item;

    const chapters = data.chapters.map((c) => ({
        ...withProject(c),
        createdAt: toDate(c.createdAt),
        updatedAt: toDate(c.updatedAt),
    }));
    const scenes = data.scenes.map((s) => ({
        ...withProject(s),
        createdAt: toDate(s.createdAt),
        updatedAt: toDate(s.updatedAt),
    }));
    const lores = data.lores.map((l) => ({
        ...withProject(l),
        createdAt: toDate(l.createdAt),
        updatedAt: toDate(l.updatedAt),
    }));
    const characters = data.characters.map((c) => withProject(c));
    const characterRelationships = data.characterRelationships.map((r) =>
        withProject(r),
    );

    const aiConversations = (data.aiConversations ?? []).map((c) => ({
        ...withProject(c),
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
            db.projects,
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
            await db.projects.clear();
            await db.chapters.clear();
            await db.scenes.clear();
            await db.characters.clear();
            await db.characterRelationships.clear();
            await db.lores.clear();
            await db.settings.clear();
            await db.aiConversations.clear();
            await db.aiMessages.clear();
            await db.characterMessages.clear();

            await db.projects.bulkAdd(projects);
            await db.chapters.bulkAdd(chapters);
            await db.scenes.bulkAdd(scenes);
            await db.characters.bulkAdd(characters);
            await db.characterRelationships.bulkAdd(characterRelationships);
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
