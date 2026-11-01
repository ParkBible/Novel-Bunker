import {
    type AiModelId,
    DEFAULT_AI_MODEL,
    isAiModelId,
} from "@/app/(shared)/routes";

// DeepSeek Chat Completions API (OpenAI 호환). 키는 서버 환경변수에서만 읽는다.
const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";

type ChatRole = "system" | "user" | "assistant";
interface ChatMessage {
    role: ChatRole;
    content: string;
}

// 클라이언트에서 오는 대화 기록 형식 (기존 저장 데이터와 호환: model = assistant)
export interface ClientMessage {
    role: "user" | "model";
    text: string;
}

// 라우트가 그대로 응답 상태/메시지로 쓰는 에러
export class AiServiceError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = "AiServiceError";
    }
}

function resolveModel(modelId: unknown, jsonMode?: boolean): AiModelId {
    // deepseek-reasoner는 response_format(JSON 모드)을 지원하지 않으므로 chat 모델로 고정
    if (jsonMode) return "deepseek-chat";
    return isAiModelId(modelId) ? modelId : DEFAULT_AI_MODEL;
}

// 예전 버전이 실패 시 대화 기록에 'model' 메시지로 저장하던 오류 문구.
// LLM에 대화 기록으로 다시 보내지 않도록 걸러낸다.
const LEGACY_ERROR_REPLIES = new Set([
    "응답을 생성하지 못했습니다.",
    "Failed to generate a response.",
]);

// 업스트림 상태 코드를 사용자에게 보여줄 메시지로 변환.
// DeepSeek의 401은 서버 키 문제이므로 클라이언트에 401(로그인 필요)로 넘기지 않는다.
function mapUpstreamError(status: number, fallback: string): AiServiceError {
    switch (status) {
        case 401:
        case 403:
            return new AiServiceError(
                "서버의 DeepSeek API 키가 올바르지 않아요. 환경변수 DEEPSEEK_API_KEY를 확인해 주세요.",
                502,
            );
        case 402:
            return new AiServiceError(
                "DeepSeek 계정 잔액이 부족해요. 충전한 뒤 다시 시도해 주세요.",
                402,
            );
        case 429:
            return new AiServiceError(
                "AI 요청이 너무 많아요. 잠시 후 다시 시도해 주세요.",
                429,
            );
        case 500:
        case 503:
            return new AiServiceError(
                "DeepSeek 서버가 혼잡해요. 잠시 후 다시 시도해 주세요.",
                503,
            );
        default:
            return new AiServiceError(fallback, 502);
    }
}

// deepseek-reasoner는 같은 역할의 메시지가 연달아 오는 것을 허용하지 않으므로 합친다.
// (실패한 요청 뒤 사용자 메시지가 이어지는 경우 등)
function mergeConsecutive(messages: ChatMessage[]): ChatMessage[] {
    const merged: ChatMessage[] = [];
    for (const m of messages) {
        const last = merged[merged.length - 1];
        if (last && last.role === m.role && m.role !== "system") {
            last.content = `${last.content}\n\n${m.content}`;
        } else {
            merged.push({ ...m });
        }
    }
    return merged;
}

function toChatMessages(messages: ClientMessage[]): ChatMessage[] {
    return messages
        .filter((m) => typeof m?.text === "string" && m.text.trim() !== "")
        .filter(
            (m) => !(m.role === "model" && LEGACY_ERROR_REPLIES.has(m.text)),
        )
        .map((m) => ({
            role: m.role === "model" ? "assistant" : "user",
            content: m.text,
        }));
}

async function createChatCompletion(
    messages: ChatMessage[],
    options: { model: unknown; jsonMode?: boolean; fallbackMessage: string },
): Promise<string> {
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) {
        throw new AiServiceError(
            "서버에 DEEPSEEK_API_KEY가 설정되지 않았어요.",
            503,
        );
    }

    let res: Response;
    try {
        res = await fetch(DEEPSEEK_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: resolveModel(options.model, options.jsonMode),
                messages: mergeConsecutive(messages),
                stream: false,
                ...(options.jsonMode
                    ? { response_format: { type: "json_object" } }
                    : {}),
            }),
        });
    } catch {
        throw new AiServiceError("DeepSeek 서버에 연결하지 못했어요.", 502);
    }

    if (!res.ok) {
        // 상태 코드만 남긴다 (요청 헤더/키는 절대 로그에 남기지 않음)
        console.error("DeepSeek API error status:", res.status);
        throw mapUpstreamError(res.status, options.fallbackMessage);
    }

    const data = (await res.json().catch(() => null)) as {
        choices?: { message?: { content?: string | null } }[];
    } | null;
    const content = data?.choices?.[0]?.message?.content;
    if (!content?.trim()) {
        throw new AiServiceError(options.fallbackMessage, 502);
    }
    return content;
}

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "");

export async function generateFeedback(
    sceneContent: string,
    synopsis: string,
    characters: string[],
    customPrompt?: string,
    modelId?: unknown,
): Promise<string> {
    const feedbackRequest = customPrompt
        ? customPrompt
        : `다음 항목에 대해 피드백을 제공해주세요:
1. 시놉시스와의 일관성
2. 캐릭터의 행동과 대사가 설정에 부합하는지
3. 문장 흐름과 가독성
4. 개선할 수 있는 부분`;

    const prompt = `당신은 전문 소설 편집자입니다. 다음 정보를 바탕으로 씬에 대한 건설적인 피드백을 제공해주세요.

**시놉시스:**
${synopsis}

**등장인물:**
${characters.join(", ") || "정보 없음"}

**씬 내용:**
${stripHtml(sceneContent)}

${feedbackRequest}

피드백은 한국어로, 친절하고 건설적인 톤으로 작성해주세요.`;

    return createChatCompletion([{ role: "user", content: prompt }], {
        model: modelId,
        fallbackMessage: "AI 피드백 생성에 실패했습니다.",
    });
}

export async function chatWithCharacter(
    characterName: string,
    characterDescription: string,
    characterTags: string[],
    messages: ClientMessage[],
    modelId?: unknown,
): Promise<string> {
    const systemInstruction = `당신은 소설 속 등장인물 "${characterName}"입니다. 아래 설정을 기반으로 이 인물처럼 대화해주세요. 절대 캐릭터에서 벗어나지 마세요.

**인물 설명:**
${characterDescription || "설정 없음"}

**태그:**
${characterTags.length > 0 ? characterTags.join(", ") : "없음"}

항상 한국어로 답변하고, 이 인물의 성격과 말투를 일관되게 유지하세요.`;

    return createChatCompletion(
        [
            { role: "system", content: systemInstruction },
            ...toChatMessages(messages),
        ],
        { model: modelId, fallbackMessage: "캐릭터 대화 생성에 실패했습니다." },
    );
}

export async function generateAiChatReply(
    messages: ClientMessage[],
    context?: {
        type: "scene" | "chapter";
        title: string;
        content: string;
    },
    modelId?: unknown,
): Promise<string> {
    const chatMessages = toChatMessages(messages);

    // 참조 컨텍스트는 마지막 사용자 메시지 앞에 붙인다 (기존 동작 유지)
    const last = chatMessages[chatMessages.length - 1];
    if (context && last?.role === "user") {
        const typeLabel = context.type === "scene" ? "씬" : "챕터";
        const stripped = stripHtml(context.content).slice(0, 3000);
        last.content = `[참조 ${typeLabel}: ${context.title}]\n${stripped}\n\n${last.content}`;
    }

    return createChatCompletion(
        [
            {
                role: "system",
                content:
                    "당신은 소설 창작을 도와주는 AI 어시스턴트입니다. 작가의 질문에 친절하고 건설적으로 답변하세요. 항상 한국어로 답변하세요.",
            },
            ...chatMessages,
        ],
        { model: modelId, fallbackMessage: "AI 응답 생성에 실패했습니다." },
    );
}

interface GrammarCorrection {
    original: string;
    corrected: string;
    reason: string;
}

// JSON 모드 응답 검증: 형식이 어긋나면 null
function parseGrammarResult(raw: string): GrammarCorrection[] | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }
    if (typeof parsed !== "object" || parsed === null) return null;
    const corrections = (parsed as { corrections?: unknown }).corrections;
    if (!Array.isArray(corrections)) return null;

    const result: GrammarCorrection[] = [];
    for (const item of corrections) {
        if (typeof item !== "object" || item === null) return null;
        const { original, corrected, reason } = item as Record<string, unknown>;
        if (typeof original !== "string" || typeof corrected !== "string") {
            return null;
        }
        result.push({
            original,
            corrected,
            reason: typeof reason === "string" ? reason : "",
        });
    }
    return result;
}

export async function checkGrammar(
    content: string,
    modelId?: unknown,
): Promise<string> {
    const failMessage = "문법 검사에 실패했습니다.";
    // DeepSeek JSON 모드는 프롬프트에 "json"과 출력 예시가 있어야 안정적으로 동작한다
    const prompt = `다음 텍스트의 맞춤법과 문법을 검토하고, 발견된 오류를 수정해주세요.

**원문:**
${stripHtml(content)}

결과는 반드시 아래 형식의 JSON 객체로만 응답하세요. 오류가 없다면 corrections를 빈 배열로 두세요.
{"corrections": [{"original": "틀린 부분", "corrected": "고친 표현", "reason": "짧은 이유"}]}`;

    const raw = await createChatCompletion(
        [{ role: "user", content: prompt }],
        {
            model: modelId,
            jsonMode: true,
            fallbackMessage: failMessage,
        },
    );

    const corrections = parseGrammarResult(raw);
    if (!corrections) throw new AiServiceError(failMessage, 502);
    if (corrections.length === 0) {
        return "맞춤법 및 문법 오류가 발견되지 않았습니다.";
    }
    // 응답 형식(문자열)은 기존과 동일하게 유지
    return corrections
        .map(
            (c, i) =>
                `${i + 1}. "${c.original}" → "${c.corrected}"${c.reason ? ` (${c.reason})` : ""}`,
        )
        .join("\n");
}
