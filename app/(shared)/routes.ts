export const routes = {
    chapter: (id: number) => `/chapter/${id}`,
    chapterPrefix: "/chapter/",
} as const;

export const apiRoutes = {
    aiFeedback: "/api/ai/feedback",
} as const;
