import { create } from "zustand";
import type {
    Chapter,
    Character,
    CharacterRelationship,
    Lore,
    Scene,
} from "../db";
import {
    chapterOps,
    characterOps,
    loreOps,
    novelOps,
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
    loadData: () => Promise<void>;
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

export const useEditorStore = create<EditorState>((set, get) => ({
    // Initial state
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
    loadData: async () => {
        if (!get().isInitialized) {
            await initializeDemoData();
        }

        const [
            chapters,
            scenes,
            characters,
            relationships,
            lores,
            synopsis,
            novelTitle,
            savedCategories,
            savedCharGroups,
            savedGeminiModel,
            savedGeminiApiKey,
        ] = await Promise.all([
            chapterOps.getAll(),
            sceneOps.getAll(),
            characterOps.getAll(),
            relationshipOps.getAll(),
            loreOps.getAll(),
            settingsOps.get("synopsis"),
            settingsOps.get("novelTitle"),
            settingsOps.get("loreCategories"),
            settingsOps.get("characterGroups"),
            settingsOps.get("geminiModel"),
            settingsOps.get("geminiApiKey"),
        ]);

        const defaultCategories = ["세계관", "장소", "아이템"];
        const loreCategories = (() => {
            if (!savedCategories) return defaultCategories;
            try {
                return JSON.parse(savedCategories);
            } catch (e) {
                console.error(
                    "Failed to parse loreCategories from settings:",
                    e,
                );
                return defaultCategories;
            }
        })();

        const defaultCharGroups = ["주인공", "조연", "기타"];
        const characterGroups = (() => {
            if (!savedCharGroups) return defaultCharGroups;
            try {
                return JSON.parse(savedCharGroups);
            } catch {
                return defaultCharGroups;
            }
        })();

        set({
            chapters,
            scenes,
            characters,
            relationships,
            lores,
            loreCategories,
            characterGroups,
            synopsis: synopsis || "",
            novelTitle: novelTitle || "",
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

    addChapter: async (title) => {
        const { chapters, expandedChapterIds } = get();
        const id = await chapterOps.create(title);
        const order =
            chapters.length > 0
                ? Math.max(...chapters.map((c) => c.order)) + 1
                : 0;
        const newChapter: Chapter = {
            id,
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
        await novelOps.updateNovelTitle(title);
        set({ novelTitle: title });
    },

    // Character actions
    addCharacter: async (name, group) => {
        const order = get().characters.length;
        const id = await characterOps.create(name, "", [], order, group);
        const newCharacter: Character = {
            id,
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
        await settingsOps.set("characterGroups", JSON.stringify(groups));
        set({ characterGroups: groups });
    },

    removeCharacterGroup: async (group) => {
        const groups = get().characterGroups.filter((g) => g !== group);
        await settingsOps.set("characterGroups", JSON.stringify(groups));
        set({ characterGroups: groups });
    },

    renameCharacterGroup: async (oldName, newName) => {
        const groups = get().characterGroups.map((g) =>
            g === oldName ? newName : g,
        );
        await settingsOps.set("characterGroups", JSON.stringify(groups));
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
        const id = await relationshipOps.create(
            fromCharacterId,
            toCharacterId,
            label,
        );
        const newRelationship = { id, fromCharacterId, toCharacterId, label };
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
        const id = await loreOps.create(name, category);
        const newLore = {
            id,
            name,
            category,
            description: "",
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
        await settingsOps.set("loreCategories", JSON.stringify(categories));
        set({ loreCategories: categories });
    },

    removeLoreCategory: async (category) => {
        const categories = get().loreCategories.filter((c) => c !== category);
        await settingsOps.set("loreCategories", JSON.stringify(categories));
        set({ loreCategories: categories });
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
