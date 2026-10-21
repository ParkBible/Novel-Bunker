import type { Scene } from "@/app/(shared)/db";

export const stripTags = (html: string): string => html.replace(/<[^>]*>/g, "");

// 마지막으로 손댄 씬. 이어 쓰기 진입점으로 쓴다.
export function recentScenes(scenes: Scene[], limit: number): Scene[] {
    return [...scenes]
        .sort(
            (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime(),
        )
        .slice(0, limit);
}
