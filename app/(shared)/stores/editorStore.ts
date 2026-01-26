import { create } from 'zustand';
import type { Chapter, Scene, Character } from '../db';

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
  
  // Helper methods
  getScenesForChapter: (chapterId: number) => Scene[];
  getSelectedScene: () => Scene | null;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  chapters: [],
  scenes: [],
  characters: [],
  synopsis: '',
  selectedSceneId: null,
  isLoadingAI: false,
  
  // Actions
  setChapters: (chapters) => set({ chapters }),
  setScenes: (scenes) => set({ scenes }),
  setCharacters: (characters) => set({ characters }),
  setSynopsis: (synopsis) => set({ synopsis }),
  setSelectedSceneId: (selectedSceneId) => set({ selectedSceneId }),
  setIsLoadingAI: (isLoadingAI) => set({ isLoadingAI }),
  
  // Helper methods
  getScenesForChapter: (chapterId) => {
    return get().scenes.filter(scene => scene.chapterId === chapterId);
  },
  
  getSelectedScene: () => {
    const { scenes, selectedSceneId } = get();
    if (!selectedSceneId) return null;
    return scenes.find(scene => scene.id === selectedSceneId) || null;
  }
}));
