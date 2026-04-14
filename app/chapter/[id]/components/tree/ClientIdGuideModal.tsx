"use client";

import { ExternalLink, X } from "lucide-react";

interface Step {
    title: string;
    desc: string;
    link?: { label: string; href: string };
    highlight?: string;
}

const STEPS: Step[] = [
    {
        title: "Google Cloud Console 접속",
        desc: "Google 계정으로 로그인한 뒤 새 프로젝트를 만드세요.",
        link: {
            label: "console.cloud.google.com 열기",
            href: "https://console.cloud.google.com/",
        },
    },
    {
        title: "Google Drive API 활성화",
        desc: '좌측 메뉴에서 "API 및 서비스 → 라이브러리"를 열고 Google Drive API를 검색해 사용 설정하세요.',
        link: {
            label: "Drive API 라이브러리 열기",
            href: "https://console.cloud.google.com/apis/library/drive.googleapis.com",
        },
    },
    {
        title: "OAuth 동의 화면 설정",
        desc: '"API 및 서비스 → OAuth 동의 화면"에서 User Type을 외부로 선택하고 앱 이름과 이메일을 입력하세요. 테스트 사용자 섹션에 본인 구글 계정을 추가하세요.',
        link: {
            label: "OAuth 동의 화면 열기",
            href: "https://console.cloud.google.com/apis/credentials/consent",
        },
        highlight: "앱을 게시하지 말고 테스트 모드를 유지하세요.",
    },
    {
        title: "OAuth 클라이언트 ID 발급",
        desc: '"API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID"를 선택하세요. 애플리케이션 유형은 웹 애플리케이션으로 선택하고, 승인된 JavaScript 원본에 아래 주소를 추가하세요.',
        link: {
            label: "사용자 인증 정보 열기",
            href: "https://console.cloud.google.com/apis/credentials",
        },
        highlight: "http://localhost:3000",
    },
    {
        title: "클라이언트 ID 복사 후 입력",
        desc: '생성된 클라이언트 ID는 "xxxxx.apps.googleusercontent.com" 형태입니다. 복사해서 아래 입력란에 붙여넣으세요.',
    },
];

interface Props {
    onClose: () => void;
}

export function ClientIdGuideModal({ onClose }: Props) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
                aria-label="모달 닫기"
            />
            <div className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                {/* 헤더 */}
                <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            Google OAuth 클라이언트 ID 발급
                        </h2>
                        <p className="mt-0.5 text-xs text-zinc-400">
                            본인 구글 계정으로 직접 Drive 백업을 연동할 수
                            있습니다
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* 단계 목록 */}
                <ol className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
                    {STEPS.map((step, i) => (
                        <li key={step.title} className="flex gap-3">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                {i + 1}
                            </span>
                            <div className="flex flex-col gap-1">
                                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                                    {step.title}
                                </p>
                                <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                    {step.desc}
                                </p>
                                {step.highlight && (
                                    <code className="w-fit rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                        {step.highlight}
                                    </code>
                                )}
                                {step.link && (
                                    <a
                                        href={step.link.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex w-fit items-center gap-1 text-xs text-blue-500 hover:underline dark:text-blue-400"
                                    >
                                        {step.link.label}
                                        <ExternalLink className="size-3" />
                                    </a>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>

                {/* 푸터 */}
                <div className="border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-lg bg-zinc-100 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
