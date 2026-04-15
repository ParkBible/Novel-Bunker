export interface AttachedContext {
    type: "scene" | "chapter";
    id: number;
    title: string;
    content: string;
}

export interface MentionItem {
    type: "scene" | "chapter";
    id: number;
    title: string;
    content?: string;
    chapterTitle?: string;
}
