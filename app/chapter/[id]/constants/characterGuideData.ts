import type { Character } from "@/app/(shared)/db";

export interface GuideItem {
    label: string;
    example: string;
}

export const LONG_FIELDS: {
    key: keyof Character;
    label: string;
    description: string;
    guide: GuideItem[];
}[] = [
    {
        key: "appearance",
        label: "외모",
        description: "캐릭터를 떠올렸을 때 가장 먼저 보이는 시각적 특징",
        guide: [
            {
                label: "신체 조건",
                example: "180cm의 마른 체격, 창백한 피부, 넓은 어깨",
            },
            {
                label: "얼굴 특징",
                example: "날카롭게 올라간 눈매, 짙은 눈썹, 왼쪽 뺨의 작은 점",
            },
            {
                label: "스타일",
                example:
                    "단정하게 다듬은 검은 머리, 무채색 계열의 긴 코트, 은색 안경",
            },
            {
                label: "특이사항",
                example: "왼쪽 손등의 십자가 문신, 거친 손마디, 약간 굽은 자세",
            },
        ],
    },
    {
        key: "personality",
        label: "성격",
        description:
            "사건을 마주했을 때 캐릭터가 어떻게 행동하고 반응할지 결정하는 내면적 특징",
        guide: [
            {
                label: "기본 성격",
                example:
                    "겉으로는 냉정하지만 신뢰하는 사람에게는 따뜻한 이중성",
            },
            {
                label: "장점",
                example:
                    "위기 상황에서의 침착한 판단력, 결정한 일을 끝까지 밀어붙이는 추진력",
            },
            {
                label: "단점",
                example: "타인의 도움을 거부하고 혼자 해결하려는 고집",
            },
            {
                label: "말버릇/습관",
                example:
                    "생각할 때 안경을 고쳐 쓰는 버릇, 불안할 때 왼손을 꽉 쥐는 습관",
            },
        ],
    },
    {
        key: "description",
        label: "설명",
        description:
            "인물의 과거와 현재 상황, 그리고 이야기가 진행되며 겪게 될 변화",
        guide: [
            {
                label: "배경",
                example: "고아원 출신, 어린 시절부터 혼자 터득한 생존 방식",
            },
            {
                label: "현재",
                example: "사설 탐정 사무소 운영, 의뢰인들의 미해결 사건 전담",
            },
            {
                label: "목표",
                example: "10년 전 실종된 쌍둥이 동생의 행방",
            },
            {
                label: "변화",
                example: "진실을 파헤칠수록 무너지는 자신의 신념",
            },
        ],
    },
];
