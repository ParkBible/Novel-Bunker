"use client";

import type { DiffLine } from "@/app/(shared)/utils/diff";

// GitHub식 통합(unified) diff 줄 렌더러.
// 버전 기록 비교와 Drive 받기 미리보기가 같은 모양을 쓰도록 여기로 뺐다.
//   빨강(−) = 이전 쪽에만 있던 문단
//   초록(+) = 이후 쪽에서 새로 생긴 문단
// 강조는 문단 단위까지만 한다. 글자 단위로 쪼개면 본문이 읽히지 않는다.
const LINE_STYLE: Record<DiffLine["type"], string> = {
    del: "border-red-300 bg-red-50/70 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200",
    add: "border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
    same: "border-transparent text-zinc-600 dark:text-zinc-400",
};

const MARKER: Record<DiffLine["type"], string> = {
    del: "−",
    add: "+",
    same: "",
};

// diffScenes는 제목 변경도 잡으려고 본문 앞에 "# 제목" 줄을 끼워 넣는다.
// 섹션 머리말에 제목이 이미 있으므로, 그대로면 감추고 바뀐 경우만 남긴다.
const TITLE_LINE = /^# /;

export function DiffLines({ lines }: { lines: DiffLine[] }) {
    const shown = lines.filter(
        (line) => !(line.type === "same" && TITLE_LINE.test(line.text)),
    );

    return (
        <div className="flex flex-col">
            {shown.map((line, i) => (
                <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: diff 줄은 순서가 고정
                    key={i}
                    className={`flex gap-1.5 border-l-2 px-2 py-1 text-xs leading-relaxed ${LINE_STYLE[line.type]}`}
                >
                    <span
                        aria-hidden="true"
                        className="w-2 shrink-0 select-none text-center opacity-60"
                    >
                        {MARKER[line.type]}
                    </span>
                    <span className="whitespace-pre-wrap break-words">
                        {line.text}
                    </span>
                </div>
            ))}
        </div>
    );
}
