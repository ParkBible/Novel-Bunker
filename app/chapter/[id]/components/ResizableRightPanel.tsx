"use client";

import {
    type KeyboardEvent,
    type PointerEvent,
    type ReactNode,
    useEffect,
    useRef,
    useState,
} from "react";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";

const WIDTH_STORAGE_KEY = "novelbunker:contextPanelWidth";
const MIN_WIDTH_PX = 280;
// 가운데 에디터 자리가 너무 좁아지지 않도록 화면 너비의 절반까지만
const MAX_WIDTH_VW = 50;
const KEYBOARD_STEP_PX = 24;

function readStoredWidth(): number | null {
    try {
        const width = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
        return Number.isFinite(width) && width > 0 ? width : null;
    } catch {
        return null;
    }
}

function writeStoredWidth(width: number | null): void {
    try {
        if (width === null) localStorage.removeItem(WIDTH_STORAGE_KEY);
        else localStorage.setItem(WIDTH_STORAGE_KEY, String(Math.round(width)));
    } catch {
        // 저장 실패해도 이번 화면에서는 조절이 된다
    }
}

function clampWidth(width: number): number {
    const max = Math.max(
        MIN_WIDTH_PX,
        (window.innerWidth * MAX_WIDTH_VW) / 100,
    );
    return Math.min(Math.max(width, MIN_WIDTH_PX), max);
}

interface ResizableRightPanelProps {
    children: ReactNode;
}

/** 데스크톱 오른쪽 패널. 왼쪽 가장자리를 끌어 너비를 바꾸고, 더블클릭하면 기본 너비로 돌아간다 */
export function ResizableRightPanel({ children }: ResizableRightPanelProps) {
    const t = useTranslation();
    const panelRef = useRef<HTMLDivElement>(null);
    // null이면 기본 너비(클래스의 clamp)를 쓴다
    const [width, setWidth] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    // 누르자마자 오는 첫 이동은 리렌더 전이라 state로는 놓친다
    const draggingRef = useRef(false);
    // 그냥 클릭만 했을 때 기본 너비가 고정 px로 바뀌어 저장되지 않게
    const movedRef = useRef(false);

    // localStorage는 SSR에서 못 읽으므로 마운트 후 반영 (hydration 불일치 방지)
    useEffect(() => {
        setWidth(readStoredWidth());
    }, []);

    // 끄는 동안 에디터 글자가 같이 선택되거나 커서가 깜빡이지 않게
    useEffect(() => {
        if (!isDragging) return;
        const { style } = document.body;
        const previousCursor = style.cursor;
        const previousUserSelect = style.userSelect;
        style.cursor = "col-resize";
        style.userSelect = "none";
        return () => {
            style.cursor = previousCursor;
            style.userSelect = previousUserSelect;
        };
    }, [isDragging]);

    const widthAtPointer = (clientX: number): number | null => {
        const panel = panelRef.current;
        if (!panel) return null;
        return clampWidth(panel.getBoundingClientRect().right - clientX);
    };

    const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        draggingRef.current = true;
        movedRef.current = false;
        setIsDragging(true);
    };

    const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (!draggingRef.current) return;
        const next = widthAtPointer(e.clientX);
        if (next === null) return;
        movedRef.current = true;
        setWidth(next);
    };

    const finishDrag = (e: PointerEvent<HTMLDivElement>) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        setIsDragging(false);
        if (!movedRef.current) return;
        const finalWidth = widthAtPointer(e.clientX);
        if (finalWidth === null) return;
        setWidth(finalWidth);
        writeStoredWidth(finalWidth);
    };

    const resetWidth = () => {
        setWidth(null);
        writeStoredWidth(null);
    };

    // 패널이 오른쪽에 붙어 있으므로 ←는 넓히기, →는 좁히기
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const current = width ?? panelRef.current?.offsetWidth ?? MIN_WIDTH_PX;
        const delta =
            e.key === "ArrowLeft" ? KEYBOARD_STEP_PX : -KEYBOARD_STEP_PX;
        const next = clampWidth(current + delta);
        setWidth(next);
        writeStoredWidth(next);
    };

    const label = t("chapterLayout_resizeContextPanel");

    return (
        <div
            ref={panelRef}
            className="relative w-[clamp(20rem,24vw,32rem)] flex-shrink-0"
            // 창 크기가 줄면 저장된 너비가 커도 CSS가 상한(50vw)에 맞춘다
            style={
                width === null
                    ? undefined
                    : {
                          width: `clamp(${MIN_WIDTH_PX}px, ${width}px, ${MAX_WIDTH_VW}vw)`,
                      }
            }
        >
            {/* biome-ignore lint/a11y/useSemanticElements: 끌 수 있는 창 분할선은 <hr>로 만들 수 없다 */}
            <div
                role="separator"
                aria-orientation="vertical"
                aria-label={label}
                aria-valuemin={MIN_WIDTH_PX}
                aria-valuenow={width === null ? undefined : Math.round(width)}
                title={label}
                tabIndex={0}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
                onDoubleClick={resetWidth}
                onKeyDown={handleKeyDown}
                // 가운데 에디터의 스크롤바를 가리지 않도록 패널 안쪽에만 둔다
                className="group absolute inset-y-0 left-0 z-10 w-1.5 cursor-col-resize outline-none"
            >
                <span
                    className={`absolute inset-y-0 left-0 w-0.5 transition-colors group-hover:bg-blue-400 group-focus-visible:bg-blue-500 ${
                        isDragging ? "bg-blue-500" : "bg-transparent"
                    }`}
                />
            </div>
            {children}
        </div>
    );
}
