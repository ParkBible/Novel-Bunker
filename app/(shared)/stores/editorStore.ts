import { create } from "zustand";
import type { Chapter, Character, Scene } from "../db";
import { chapterOps, sceneOps } from "../db/operations";

interface EditorState {
    // Data
    chapters: Chapter[];
    scenes: Scene[];
    characters: Character[];
    synopsis: string;
    novelTitle: string;

    // UI State
    selectedSceneId: number | null;
    isLoadingAI: boolean;
    isInitialized: boolean;

    // Actions
    setChapters: (chapters: Chapter[]) => void;
    setScenes: (scenes: Scene[]) => void;
    setCharacters: (characters: Character[]) => void;
    setSynopsis: (synopsis: string) => void;
    setNovelTitle: (title: string) => void;
    updateNovelTitle: (title: string) => Promise<void>;
    setSelectedSceneId: (id: number | null) => void;
    setIsLoadingAI: (loading: boolean) => void;
    setInitialized: (initialized: boolean) => void;

    // Update actions
    updateChapterTitle: (chapterId: number, title: string) => Promise<void>;

    // Delete actions
    deleteChapter: (chapterId: number) => Promise<void>;
    deleteScene: (sceneId: number) => Promise<void>;

    // Helper methods
    getScenesForChapter: (chapterId: number) => Scene[];
    getSelectedScene: () => Scene | null;
}

export const useEditorStore = create<EditorState>((set, get) => ({
    // Initial state
    chapters: [],
    scenes: [],
    characters: [],
    synopsis: "",
    novelTitle: "",
    selectedSceneId: null,
    isLoadingAI: false,
    isInitialized: false,

    // Actions
    setChapters: (chapters) => set({ chapters }),
    setScenes: (scenes) => set({ scenes }),
    setCharacters: (characters) => set({ characters }),
    setSynopsis: (synopsis) => set({ synopsis }),
    setNovelTitle: (novelTitle) => set({ novelTitle }),
    updateNovelTitle: async (title) => {
        await db.settings.put({ key: "novelTitle", value: title });
        set({ novelTitle: title });
    },
    setSelectedSceneId: (selectedSceneId) => set({ selectedSceneId }),
    setIsLoadingAI: (isLoadingAI) => set({ isLoadingAI }),
    setInitialized: (isInitialized) => set({ isInitialized }),

    // Update actions
    updateChapterTitle: async (chapterId, title) => {
        await db.chapters.update(chapterId, { title, updatedAt: new Date() });
        const { chapters } = get();
        set({
            chapters: chapters.map((c) =>
                c.id === chapterId ? { ...c, title } : c,
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
