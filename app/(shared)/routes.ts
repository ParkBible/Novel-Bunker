export const routes = {
    dashboard: "/",
    chapter: (id: number) => `/chapter/${id}`,
    chapterPrefix: "/chapter/",
} as const;

export const apiRoutes = {
    aiFeedback: "/api/ai/feedback",
    aiChat: "/api/ai/chat",
    characterChat: "/api/ai/character-chat",
} as const;
