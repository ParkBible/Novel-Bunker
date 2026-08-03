import { create } from "zustand";
import type {
    Chapter,
    Character,
    CharacterRelationship,
    Lore,
    Project,
    Scene,
} from "../db";
import {
    chapterOps,
    characterOps,
    loreOps,
    projectOps,
    relationshipOps,
    sceneOps,
    settingsOps,
} from "../db/operations";
import {
    DEFAULT_GEMINI_MODEL,
    GEMINI_MODELS,
    type GeminiModelId,
} from "../routes";
import { initializeDemoData } from "../utils/demoData";

export type DetailPanel =
    | { type: "character"; characterId: number }
    | { type: "lore"; loreId: number };

interface EditorState {
    // Data
    projects: Project[];
    activeProjectId: number | null;
    chapters: Chapter[];
    scenes: Scene[];
    characters: Character[];
    relationships: CharacterRelationship[];
    lores: Lore[];
    loreCategories: string[];
    characterGroups: string[];
    synopsis: string;
    novelTitle: string;

    // UI State
    selectedSceneId: number | null;
    detailPanel: DetailPanel | null;
    expandedChapterIds: Set<number>;
    isLoadingAI: boolean;
    isInitialized: boolean;
    geminiModel: GeminiModelId;
    geminiApiKey: string;
    dataVersion: number;

    // Actions
    loadProjects: () => Promise<Project[]>;
    // projectId 생략 시 현재 활성 작품(없으면 첫 작품)을 로드
    loadData: (projectId?: number) => Promise<void>;
    loadDataForChapter: (chapterId: number) => Promise<void>;
    addProject: (
        title: string,
    ) => Promise<{ projectId: number; firstChapterId: number }>;
    deleteProject: (id: number) => Promise<void>;
    renameProject: (id: number, title: string) => Promise<void>;
    reorderProjects: (activeId: number, overId: number) => Promise<void>;
    setActiveProject: (id: number) => Promise<void>;
    updateSynopsis: (synopsis: string) => Promise<void>;
    addChapter: (title: string) => Promise<number>;
    setGeminiModel: (model: GeminiModelId) => Promise<void>;
    setGeminiApiKey: (key: string) => Promise<void>;
    setSelectedSceneId: (id: number | null) => void;
    setDetailPanel: (panel: DetailPanel | null) => void;
    setIsLoadingAI: (loading: boolean) => void;
    toggleExpandedChapter: (id: number) => void;
    updateNovelTitle: (title: string) => Promise<void>;

    // Character actions
    addCharacter: (name: string, group: string) => Promise<void>;
    deleteCharacter: (id: number) => Promise<void>;
    updateCharacter: (id: number, updates: Partial<Character>) => Promise<void>;
    reorderCharacters: (activeId: number, overId: number) => Promise<void>;
    addCharacterGroup: (group: string) => Promise<void>;
    removeCharacterGroup: (group: string) => Promise<void>;
    renameCharacterGroup: (oldName: string, newName: string) => Promise<void>;

    // Update actions
    updateChapterTitle: (chapterId: number, title: string) => Promise<void>;
    updateChapterMemo: (chapterId: number, memo: string) => Promise<void>;
    updateSceneMemo: (sceneId: number, memo: string) => Promise<void>;

    // Delete actions
    deleteChapter: (chapterId: number) => Promise<void>;
    deleteScene: (sceneId: number) => Promise<void>;

    // Relationship actions
    addRelationship: (
        fromCharacterId: number,
        toCharacterId: number,
        label: string,
    ) => Promise<void>;
    removeRelationship: (id: number) => Promise<void>;

    // Lore actions
    addLore: (name: string, category: string) => Promise<void>;
    updateLore: (id: number, updates: Partial<Lore>) => Promise<void>;
    deleteLore: (id: number) => Promise<void>;
    addLoreCategory: (category: string) => Promise<void>;
    removeLoreCategory: (category: string) => Promise<void>;
    reorderLores: (
        category: string,
        activeId: number,
        overId: number,
    ) => Promise<void>;

    // Reorder actions
    reorderChapters: (activeId: number, overId: number) => Promise<void>;
    reorderScenes: (
        chapterId: number,
        activeId: number,
        overId: number,
    ) => Promise<void>;

    // Helper methods
    getScenesForChapter: (chapterId: number) => Scene[];
    getSelectedScene: () => Scene | null;
}

// 인물 그룹/설정집 카테고리는 활성 작품(Project) 레코드에 저장한다.
async function persistCharacterGroups(
    get: () => EditorState,
    groups: string[],
): Promise<void> {
    const { activeProjectId } = get();
    if (activeProjectId !== null) {
        await projectOps.update(activeProjectId, { characterGroups: groups });
    }
}

async function persistLoreCategories(
    get: () => EditorState,
    categories: string[],
): Promise<void> {
    const { activeProjectId } = get();
    if (activeProjectId !== null) {
        await projectOps.update(activeProjectId, {
            loreCategories: categories,
        });
    }
}

export const useEditorStore = create<EditorState>((set, get) => ({
    // Initial state
    projects: [],
    activeProjectId: null,
    chapters: [],
    scenes: [],
    characters: [],
    relationships: [],
    lores: [],
    loreCategories: ["세계관", "장소", "아이템"],
    characterGroups: ["주인공", "조연", "기타"],
    synopsis: "",
    novelTitle: "",
    selectedSceneId: null,
    detailPanel: null,
    expandedChapterIds: new Set<number>(),
    isLoadingAI: false,
    isInitialized: false,
    geminiModel: DEFAULT_GEMINI_MODEL,
    geminiApiKey: "",
    dataVersion: 0,

    // Actions
    // 갤러리용: 데모 데이터 보장 후 작품 목록 + 전역 설정 로드
    loadProjects: async () => {
        await initializeDemoData();
        const [projects, savedGeminiModel, savedGeminiApiKey] =
            await Promise.all([
                projectOps.getAll(),
                settingsOps.get("geminiModel"),
                settingsOps.get("geminiApiKey"),
            ]);
        set({
            projects,
            geminiModel: GEMINI_MODELS.some((m) => m.id === savedGeminiModel)
                ? (savedGeminiModel as GeminiModelId)
                : DEFAULT_GEMINI_MODEL,
            geminiApiKey: savedGeminiApiKey || "",
        });
        return projects;
    },

    // 특정 작품의 전체 데이터를 로드해 에디터/개요에서 사용
    loadData: async (projectId) => {
        await initializeDemoData();

        const allProjects = await projectOps.getAll();
        // 대상 작품 결정: 인자 > 활성 작품 > 첫 작품
        let targetId = projectId ?? get().activeProjectId ?? null;
        if (targetId === null || !allProjects.some((p) => p.id === targetId)) {
            targetId = allProjects[0]?.id ?? null;
        }

        if (targetId === null) {
            // 작품이 하나도 없음 (전부 삭제된 상태)
            set({
                projects: allProjects,
                activeProjectId: null,
                chapters: [],
                scenes: [],
                characters: [],
                relationships: [],
                lores: [],
                isInitialized: true,
                dataVersion: get().dataVersion + 1,
            });
            return;
        }

        const [
            project,
            chapters,
            scenes,
            characters,
            relationships,
            lores,
            savedGeminiModel,
            savedGeminiApiKey,
        ] = await Promise.all([
            projectOps.get(targetId),
            chapterOps.getAll(targetId),
            sceneOps.getAll(targetId),
            characterOps.getAll(targetId),
            relationshipOps.getAll(targetId),
            loreOps.getAll(targetId),
            settingsOps.get("geminiModel"),
            settingsOps.get("geminiApiKey"),
        ]);

        await settingsOps.set("activeProjectId", String(targetId));

        set({
            projects: allProjects,
            activeProjectId: targetId,
            chapters,
            scenes,
            characters,
            relationships,
            lores,
            loreCategories: project?.loreCategories ?? [
                "세계관",
                "장소",
                "아이템",
            ],
            characterGroups: project?.characterGroups ?? [
                "주인공",
                "조연",
                "기타",
            ],
            synopsis: project?.synopsis ?? "",
            novelTitle: project?.title ?? "",
            isInitialized: true,
            geminiModel: GEMINI_MODELS.some((m) => m.id === savedGeminiModel)
                ? (savedGeminiModel as GeminiModelId)
                : DEFAULT_GEMINI_MODEL,
            geminiApiKey: savedGeminiApiKey || "",
            dataVersion: get().dataVersion + 1,
            // DB에서 불러온 레코드이므로 id는 항상 존재
            expandedChapterIds: new Set(chapters.map((c) => c.id!)),
        });
    },

    // 챕터 id로 소속 작품을 찾아 로드 (딥링크/작품 전환 안전성)
    loadDataForChapter: async (chapterId) => {
        const projectId = await chapterOps.getProjectId(chapterId);
        if (projectId === undefined) {
            set({ isInitialized: true });
            return;
        }
        if (
            get().isInitialized &&
            get().activeProjectId === projectId &&
            get().chapters.some((c) => c.id === chapterId)
        ) {
            return; // 이미 해당 작품이 로드됨
        }
        await get().loadData(projectId);
    },

    addProject: async (title) => {
        const result = await projectOps.create(title);
        const projects = await projectOps.getAll();
        set({ projects });
        return result;
    },

    deleteProject: async (id) => {
        await projectOps.delete(id);
        const projects = await projectOps.getAll();
        const { activeProjectId } = get();
        set({
            projects,
            activeProjectId: activeProjectId === id ? null : activeProjectId,
        });
    },

    renameProject: async (id, title) => {
        await projectOps.update(id, { title });
        set({
            projects: get().projects.map((p) =>
                p.id === id ? { ...p, title } : p,
            ),
            novelTitle: get().activeProjectId === id ? title : get().novelTitle,
        });
    },

    reorderProjects: async (activeId, overId) => {
        const sorted = [...get().projects].sort((a, b) => a.order - b.order);
        const oldIndex = sorted.findIndex((p) => p.id === activeId);
        const newIndex = sorted.findIndex((p) => p.id === overId);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = [...sorted];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);

        await Promise.all(
            reordered.map((p, i) =>
                p.order !== i ? projectOps.reorder(p.id!, i) : null,
            ),
        );
        set({ projects: reordered.map((p, i) => ({ ...p, order: i })) });
    },

    setActiveProject: async (id) => {
        await settingsOps.set("activeProjectId", String(id));
        set({ activeProjectId: id });
    },

    updateSynopsis: async (synopsis) => {
        const { activeProjectId } = get();
        if (activeProjectId !== null) {
            await projectOps.update(activeProjectId, { synopsis });
        }
        set({ synopsis });
    },

    addChapter: async (title) => {
        const { chapters, expandedChapterIds, activeProjectId } = get();
        if (activeProjectId === null) throw new Error("활성 작품이 없습니다.");
        const id = await chapterOps.create(activeProjectId, title);
        const order =
            chapters.length > 0
                ? Math.max(...chapters.map((c) => c.order)) + 1
                : 0;
        const newChapter: Chapter = {
            id,
            projectId: activeProjectId,
            title,
            order,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const nextExpanded = new Set(expandedChapterIds);
        nextExpanded.add(id);
        set({
            chapters: [...chapters, newChapter],
            expandedChapterIds: nextExpanded,
        });
        return id;
    },

    setGeminiModel: async (geminiModel) => {
        await settingsOps.set("geminiModel", geminiModel);
        set({ geminiModel });
    },

    setGeminiApiKey: async (geminiApiKey) => {
        await settingsOps.set("geminiApiKey", geminiApiKey);
        set({ geminiApiKey });
    },

    setSelectedSceneId: (selectedSceneId) => set({ selectedSceneId }),
    setDetailPanel: (detailPanel) => set({ detailPanel }),
    setIsLoadingAI: (isLoadingAI) => set({ isLoadingAI }),
    toggleExpandedChapter: (id) => {
        const next = new Set(get().expandedChapterIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        set({ expandedChapterIds: next });
    },
    updateNovelTitle: async (title) => {
        const { activeProjectId } = get();
        if (activeProjectId !== null) {
            await projectOps.update(activeProjectId, { title });
        }
        set({
            novelTitle: title,
            projects: get().projects.map((p) =>
                p.id === activeProjectId ? { ...p, title } : p,
            ),
        });
    },

    // Character actions
    addCharacter: async (name, group) => {
        const { activeProjectId } = get();
        if (activeProjectId === null) throw new Error("활성 작품이 없습니다.");
        const order = get().characters.length;
        const id = await characterOps.create(
            activeProjectId,
            name,
            "",
            [],
            order,
            group,
        );
        const newCharacter: Character = {
            id,
            projectId: activeProjectId,
            name,
            description: "",
            tags: [],
            order,
            group,
        };
        set({ characters: [...get().characters, newCharacter] });
    },

    deleteCharacter: async (id) => {
        const relatedIds = get()
            .relationships.filter(
                (r) => r.fromCharacterId === id || r.toCharacterId === id,
            )
            .map((r) => r.id!);
        await characterOps.delete(id);
        await Promise.all(relatedIds.map((rid) => relationshipOps.delete(rid)));
        const { detailPanel } = get();
        set({
            characters: get().characters.filter((c) => c.id !== id),
            relationships: get().relationships.filter(
                (r) => r.fromCharacterId !== id && r.toCharacterId !== id,
            ),
            detailPanel:
                detailPanel?.type === "character" &&
                detailPanel.characterId === id
                    ? null
                    : detailPanel,
        });
    },

    addCharacterGroup: async (group) => {
        const groups = [...get().characterGroups, group];
        await persistCharacterGroups(get, groups);
        set({ characterGroups: groups });
    },

    removeCharacterGroup: async (group) => {
        const groups = get().characterGroups.filter((g) => g !== group);
        await persistCharacterGroups(get, groups);
        set({ characterGroups: groups });
    },

    renameCharacterGroup: async (oldName, newName) => {
        const groups = get().characterGroups.map((g) =>
            g === oldName ? newName : g,
        );
        await persistCharacterGroups(get, groups);
        const affected = get().characters.filter((c) => c.group === oldName);
        await Promise.all(
            affected.map((c) => characterOps.update(c.id!, { group: newName })),
        );
        set({
            characterGroups: groups,
            characters: get().characters.map((c) =>
                c.group === oldName ? { ...c, group: newName } : c,
            ),
        });
    },

    reorderCharacters: async (activeId, overId) => {
        const sorted = [...get().characters].sort((a, b) => a.order - b.order);
        const oldIndex = sorted.findIndex((c) => c.id === activeId);
        const newIndex = sorted.findIndex((c) => c.id === overId);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = [...sorted];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);

        await Promise.all(
            reordered.map((c, i) => characterOps.reorder(c.id!, i)),
        );
        set({ characters: reordered.map((c, i) => ({ ...c, order: i })) });
    },

    updateCharacter: async (id, updates) => {
        await characterOps.update(id, updates);
        set({
            characters: get().characters.map((c) =>
                c.id === id ? { ...c, ...updates } : c,
            ),
        });
    },

    // Update actions
    updateChapterTitle: async (chapterId, title) => {
        await chapterOps.update(chapterId, { title, updatedAt: new Date() });
        const { chapters } = get();
        set({
            chapters: chapters.map((c) =>
                c.id === chapterId ? { ...c, title } : c,
            ),
        });
    },

    updateChapterMemo: async (chapterId, memo) => {
        await chapterOps.update(chapterId, { memo });
        set({
            chapters: get().chapters.map((c) =>
                c.id === chapterId ? { ...c, memo } : c,
            ),
        });
    },

    updateSceneMemo: async (sceneId, memo) => {
        await sceneOps.update(sceneId, { memo });
        set({
            scenes: get().scenes.map((s) =>
                s.id === sceneId ? { ...s, memo } : s,
            ),
        });
    },

    // Delete actions
    deleteChapter: async (chapterId) => {
        await chapterOps.delete(chapterId);
        const { chapters, scenes, selectedSceneId } = get();
        const deletedSceneIds = scenes
            .filter((s) => s.chapterId === chapterId)
            .map((s) => s.id);
        set({
            chapters: chapters.filter((c) => c.id !== chapterId),
            scenes: scenes.filter((s) => s.chapterId !== chapterId),
            selectedSceneId:
                selectedSceneId && deletedSceneIds.includes(selectedSceneId)
                    ? null
                    : selectedSceneId,
        });
    },

    deleteScene: async (sceneId) => {
        await sceneOps.delete(sceneId);
        const { scenes, selectedSceneId } = get();
        set({
            scenes: scenes.filter((s) => s.id !== sceneId),
            selectedSceneId:
                selectedSceneId === sceneId ? null : selectedSceneId,
        });
    },

    // Relationship actions
    addRelationship: async (fromCharacterId, toCharacterId, label) => {
        const { activeProjectId } = get();
        if (activeProjectId === null) throw new Error("활성 작품이 없습니다.");
        const id = await relationshipOps.create(
            activeProjectId,
            fromCharacterId,
            toCharacterId,
            label,
        );
        const newRelationship = {
            id,
            projectId: activeProjectId,
            fromCharacterId,
            toCharacterId,
            label,
        };
        set({
            relationships: [...get().relationships, newRelationship],
        });
    },

    removeRelationship: async (id) => {
        await relationshipOps.delete(id);
        set({
            relationships: get().relationships.filter((r) => r.id !== id),
        });
    },

    // Lore actions
    addLore: async (name, category) => {
        const { activeProjectId } = get();
        if (activeProjectId === null) throw new Error("활성 작품이 없습니다.");
        const { id, order } = await loreOps.create(
            activeProjectId,
            name,
            category,
        );
        const newLore = {
            id,
            projectId: activeProjectId,
            name,
            category,
            description: "",
            order,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        set({ lores: [...get().lores, newLore] });
    },

    updateLore: async (id, updates) => {
        await loreOps.update(id, updates);
        set({
            lores: get().lores.map((l) =>
                l.id === id ? { ...l, ...updates, updatedAt: new Date() } : l,
            ),
        });
    },

    deleteLore: async (id) => {
        await loreOps.delete(id);
        set({ lores: get().lores.filter((l) => l.id !== id) });
    },

    addLoreCategory: async (category) => {
        const categories = [...get().loreCategories, category];
        await persistLoreCategories(get, categories);
        set({ loreCategories: categories });
    },

    removeLoreCategory: async (category) => {
        const categories = get().loreCategories.filter((c) => c !== category);
        await persistLoreCategories(get, categories);
        set({ loreCategories: categories });
    },

    reorderLores: async (category, activeId, overId) => {
        const { lores } = get();
        const categoryLores = lores
            .filter((l) => l.category === category)
            .sort((a, b) => a.order - b.order);

        const oldIndex = categoryLores.findIndex((l) => l.id === activeId);
        const newIndex = categoryLores.findIndex((l) => l.id === overId);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = [...categoryLores];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);

        await Promise.all(
            reordered
                .map((l, i) =>
                    l.order !== i ? loreOps.reorder(l.id!, i) : null,
                )
                .filter((p): p is Promise<void> => p !== null),
        );

        const updatedMap = new Map(reordered.map((l, i) => [l.id, i]));
        set({
            lores: lores.map((l) =>
                updatedMap.has(l.id)
                    ? { ...l, order: updatedMap.get(l.id)! }
                    : l,
            ),
        });
    },

    // Reorder actions
    reorderChapters: async (activeId, overId) => {
        const { chapters } = get();
        const sorted = [...chapters].sort((a, b) => a.order - b.order);

        const oldIndex = sorted.findIndex((c) => c.id === activeId);
        const newIndex = sorted.findIndex((c) => c.id === overId);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = [...sorted];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);

        await Promise.all(
            reordered
                .map((c, i) =>
                    c.order !== i ? chapterOps.reorder(c.id!, i) : null,
                )
                .filter((p): p is Promise<void> => p !== null),
        );

        set({ chapters: reordered.map((c, i) => ({ ...c, order: i })) });
    },

    reorderScenes: async (chapterId, activeId, overId) => {
        const { scenes } = get();
        const chapterScenes = scenes
            .filter((s) => s.chapterId === chapterId)
            .sort((a, b) => a.order - b.order);

        const oldIndex = chapterScenes.findIndex((s) => s.id === activeId);
        const newIndex = chapterScenes.findIndex((s) => s.id === overId);
        if (oldIndex === -1 || newIndex === -1) return;

        // arrayMove 로직
        const reordered = [...chapterScenes];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);

        // DB 업데이트
        const updates = reordered.map((s, i) => ({
            id: s.id!,
            order: i,
        }));
        await Promise.all(updates.map((u) => sceneOps.reorder(u.id, u.order)));

        // 스토어 업데이트
        const otherScenes = scenes.filter((s) => s.chapterId !== chapterId);
        const updatedScenes = reordered.map((s, i) => ({ ...s, order: i }));
        set({ scenes: [...otherScenes, ...updatedScenes] });
    },

    // Helper methods
    getScenesForChapter: (chapterId) => {
        return get().scenes.filter((scene) => scene.chapterId === chapterId);
    },

    getSelectedScene: () => {
        const { scenes, selectedSceneId } = get();
        if (!selectedSceneId) return null;
        return scenes.find((scene) => scene.id === selectedSceneId) || null;
    },
}));
