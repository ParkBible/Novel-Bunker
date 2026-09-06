// 인라인 주석의 저장 규약. 에디터(CommentMark)와 내보내기(export.ts)가 공유한다.
//
// 주석 내용은 본문 텍스트가 아니라 span 속성에 넣는다. 씬 본문을 평문으로 훑는
// 코드(글자 수 집계, AI 프롬프트, diff, 내보내기)가 전부 태그를 지우는 방식이라,
// 속성에 두면 그 코드를 한 줄도 고치지 않고 주석이 자동으로 제외된다.
//
// 단, 속성값을 그대로 넣으면 안 된다. innerHTML 직렬화는 속성값의 ">"를
// 이스케이프하지 않아서, 사용자가 주석에 ">"를 쓰면 `replace(/<[^>]*>/g, "")`가
// 태그 중간에서 잘려 속성값 일부가 본문 글자로 새어 나온다. percent-encoding으로
// "<", ">", "&", 따옴표를 원천 차단한다.

export const COMMENT_ATTRIBUTE = "data-comment";
export const COMMENT_LABEL = "주석";

export function encodeCommentNote(note: string): string {
    return encodeURIComponent(note);
}

export function decodeCommentNote(raw: string | null | undefined): string {
    if (!raw) return "";
    try {
        return decodeURIComponent(raw);
    } catch {
        // 손상된 값이라도 원문을 보여주는 편이 낫다
        return raw;
    }
}
