import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateFeedback(
    sceneContent: string,
    synopsis: string,
    characters: string[],
    customPrompt?: string,
): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

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
${sceneContent.replace(/<[^>]*>/g, "")}

${feedbackRequest}

피드백은 한국어로, 친절하고 건설적인 톤으로 작성해주세요.`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini API error:", error);
        throw new Error("AI 피드백 생성에 실패했습니다.");
    }
}

export async function chatWithCharacter(
    characterName: string,
    characterDescription: string,
    characterTags: string[],
    messages: { role: "user" | "model"; text: string }[],
): Promise<string> {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        systemInstruction: `당신은 소설 속 등장인물 "${characterName}"입니다. 아래 설정을 기반으로 이 인물처럼 대화해주세요. 절대 캐릭터에서 벗어나지 마세요.

**인물 설명:**
${characterDescription || "설정 없음"}

**태그:**
${characterTags.length > 0 ? characterTags.join(", ") : "없음"}

항상 한국어로 답변하고, 이 인물의 성격과 말투를 일관되게 유지하세요.`,
    });

    const chat = model.startChat({
        history: messages.slice(0, -1).map((m) => ({
            role: m.role,
            parts: [{ text: m.text }],
        })),
    });

    try {
        const lastMessage = messages[messages.length - 1];
        const result = await chat.sendMessage(lastMessage.text);
        return result.response.text();
    } catch (error) {
        console.error("Gemini API error:", error);
        throw new Error("캐릭터 대화 생성에 실패했습니다.");
    }
}

export async function checkGrammar(content: string): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `다음 텍스트의 맞춤법과 문법을 검토하고, 발견된 오류를 수정해주세요.

**원문:**
${content.replace(/<[^>]*>/g, "")}

발견된 오류와 제안을 간결하게 나열해주세요. 오류가 없다면 "맞춤법 및 문법 오류가 발견되지 않았습니다."라고 응답해주세요.`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini API error:", error);
        throw new Error("문법 검사에 실패했습니다.");
    }
}
