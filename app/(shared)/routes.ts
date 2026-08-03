export const routes = {
    home: "/", // 작품 갤러리
    work: (id: number) => `/works/${id}`, // 작품별 개요(대시보드)
    chapter: (id: number) => `/chapter/${id}`,
    chapterPrefix: "/chapter/",
} as const;

export const apiRoutes = {
    aiFeedback: "/api/ai/feedback",
    aiChat: "/api/ai/chat",
    characterChat: "/api/ai/character-chat",
} as const;

export const GEMINI_MODELS = [
    { id: "gemini-2.5-flash", label: "2.5 Flash" },
    { id: "gemini-2.5-flash-lite", label: "2.5 Lite" },
    { id: "gemini-3-flash-preview", label: "3.0 Flash" },
    { id: "gemini-3.1-flash-lite-preview", label: "3.1 Lite" },
] as const;

export type GeminiModelId = (typeof GEMINI_MODELS)[number]["id"];
export const DEFAULT_GEMINI_MODEL: GeminiModelId =
    "gemini-3.1-flash-lite-preview";
