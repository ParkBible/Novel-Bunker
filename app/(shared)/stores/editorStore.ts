import { create } from "zustand";
import type { Chapter, Character, Scene } from "../db";
import { db } from "../db";

interface EditorState {
    // Data
    chapters: Chapter[];
    scenes: Scene[];
    characters: Character[];
    synopsis: string;

    // UI State
    selectedSceneId: number | null;
    isLoadingAI: boolean;

    // Actions
    setChapters: (chapters: Chapter[]) => void;
    setScenes: (scenes: Scene[]) => void;
    setCharacters: (characters: Character[]) => void;
    setSynopsis: (synopsis: string) => void;
    setSelectedSceneId: (id: number | null) => void;
    setIsLoadingAI: (loading: boolean) => void;

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
    selectedSceneId: null,
    isLoadingAI: false,

    // Actions
    setChapters: (chapters) => set({ chapters }),
    setScenes: (scenes) => set({ scenes }),
    setCharacters: (characters) => set({ characters }),
    setSynopsis: (synopsis) => set({ synopsis }),
    setSelectedSceneId: (selectedSceneId) => set({ selectedSceneId }),
    setIsLoadingAI: (isLoadingAI) => set({ isLoadingAI }),

    // Delete actions
    deleteChapter: async (chapterId) => {
        await db.scenes.where("chapterId").equals(chapterId).delete();
        await db.chapters.delete(chapterId);
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
        await db.scenes.delete(sceneId);
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
