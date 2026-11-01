// /api/ai/* 호출 공통 헬퍼. 401이면 AiAuthError로 구분해 로그인 안내를 띄운다.

export class AiAuthError extends Error {
    constructor(msg: string) {
        super(msg);
        this.name = "AiAuthError";
    }
}

export async function postAi<T>(
    url: string,
    body: unknown,
    fallbackError: string,
): Promise<T> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
        throw new AiAuthError(data.error ?? fallbackError);
    }
    if (!res.ok) {
        throw new Error(data.error ?? fallbackError);
    }
    return data as T;
}
