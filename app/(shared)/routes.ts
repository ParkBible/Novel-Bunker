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
    authConfig: "/api/auth/config",
} as const;

// DeepSeek 모델 목록 (서버는 이 목록에 있는 모델만 허용한다)
export const AI_MODELS = [
    { id: "deepseek-chat", label: "Chat" },
    { id: "deepseek-reasoner", label: "Reasoner" },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]["id"];
export const DEFAULT_AI_MODEL: AiModelId = "deepseek-chat";

export function isAiModelId(value: unknown): value is AiModelId {
    return AI_MODELS.some((m) => m.id === value);
}
