// @tiptap/core는 직접 의존성이 아니라 @tiptap/react의 재노출을 통해 가져온다
// (pnpm은 선언하지 않은 패키지의 직접 import를 막는다)
import { Mark, mergeAttributes } from "@tiptap/react";
import {
    COMMENT_ATTRIBUTE,
    decodeCommentNote,
    encodeCommentNote,
} from "./comment";

// 본문 특정 구간에 붙이는 인라인 주석. 저장 규약은 ./comment 참고.
// 적용/해제는 표준 setMark("comment", { note }) / unsetMark("comment")로 한다.

export const CommentMark = Mark.create({
    name: "comment",

    // 주석 구간 끝에 이어 타이핑한 글자까지 주석에 딸려 들어가지 않게 한다.
    // (굵게/기울임과 달리 주석은 "이 구간"에 대한 메모라 번지면 안 된다)
    inclusive: false,

    addAttributes() {
        return {
            note: {
                default: "",
                parseHTML: (element: HTMLElement) =>
                    decodeCommentNote(element.getAttribute(COMMENT_ATTRIBUTE)),
                renderHTML: (attributes: { note?: string }) => ({
                    [COMMENT_ATTRIBUTE]: encodeCommentNote(
                        attributes.note ?? "",
                    ),
                }),
            },
        };
    },

    parseHTML() {
        return [{ tag: `span[${COMMENT_ATTRIBUTE}]` }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "span",
            mergeAttributes(HTMLAttributes, { class: "nb-comment" }),
            0,
        ];
    },
});
