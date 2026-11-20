export const routes = {
    home: "/", // 작품 갤러리
    work: (id: number) => `/works/${id}`, // 작품별 개요(대시보드)
    chapter: (id: number) => `/chapter/${id}`,
    chapterPrefix: "/chapter/",
} as const;

// 내 서비스 모음 대시보드 (Park-Hub)
export const HUB_URL = "https://park-bible.com";

export const apiRoutes = {
    aiFeedback: "/api/ai/feedback",
    aiChat: "/api/ai/chat",
    characterChat: "/api/ai/character-chat",
    authConfig: "/api/auth/config",
} as const;

// DeepSeek 답변 방식. 둘 다 같은 모델(deepseek-flash)이고 생각 모드만 켜고 끈다.
// 서버는 이 목록에 있는 값만 허용한다
export const AI_MODELS = [
    { id: "fast", labelKey: "aiModel_fast" },
    { id: "thinking", labelKey: "aiModel_thinking" },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]["id"];
export const DEFAULT_AI_MODEL: AiModelId = "fast";

export function isAiModelId(value: unknown): value is AiModelId {
    return AI_MODELS.some((m) => m.id === value);
}
