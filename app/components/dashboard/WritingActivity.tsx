"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { writingLogOps } from "@/app/(shared)/db/operations";
import { dateKey, type WritingLog } from "@/app/(shared)/db/writingLog";
import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { DashboardCard } from "./DashboardCard";

const WEEKS = 20;

// 한 색상(zinc)의 명도 단계. 0은 기록 없음, 4가 가장 많이 쓴 날.
// 다크 모드는 반전이 아니라 어두운 배경에 맞춘 단계를 따로 쓴다.
const LEVEL_CLASSES = [
    "bg-zinc-100 dark:bg-zinc-800/70",
    "bg-zinc-300 dark:bg-zinc-700",
    "bg-zinc-400 dark:bg-zinc-500",
    "bg-zinc-600 dark:bg-zinc-300",
    "bg-zinc-900 dark:bg-zinc-100",
];

interface Day {
    key: string;
    date: Date;
    future: boolean;
}

// 20주 전 일요일부터 이번 주 토요일까지. 열 하나가 한 주다.
function buildDays(today: Date): Day[] {
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay() - (WEEKS - 1) * 7);
    const todayKey = dateKey(today);
    const days: Day[] = [];
    let future = false;
    for (let i = 0; i < WEEKS * 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const key = dateKey(date);
        days.push({ key, date, future });
        if (key === todayKey) future = true;
    }
    return days;
}

// 쓴 날들의 분량 사분위로 단계를 나눈다. 하루 몰아 쓴 날이 있어도
// 나머지 날이 전부 가장 옅은 칸으로 뭉개지지 않게 하기 위함.
function levelOf(added: number, sorted: number[]): number {
    if (added <= 0 || sorted.length === 0) return 0;
    const q = (p: number) => sorted[Math.floor((sorted.length - 1) * p)];
    if (added <= q(0.25)) return 1;
    if (added <= q(0.5)) return 2;
    if (added <= q(0.75)) return 3;
    return 4;
}

function shiftDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

export function WritingActivity() {
    const t = useTranslation();
    const activeProjectId = useEditorStore((s) => s.activeProjectId);
    const [logs, setLogs] = useState<Map<string, WritingLog>>(new Map());
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    useEffect(() => {
        if (activeProjectId === null) return;
        let cancelled = false;
        writingLogOps.getByProject(activeProjectId).then((rows) => {
            if (!cancelled) setLogs(new Map(rows.map((r) => [r.date, r])));
        });
        return () => {
            cancelled = true;
        };
    }, [activeProjectId]);

    const today = new Date();
    const todayKey = dateKey(today);
    const days = buildDays(today);
    const addedOn = (key: string) => logs.get(key)?.added ?? 0;

    const sorted = days
        .map((d) => addedOn(d.key))
        .filter((n) => n > 0)
        .sort((a, b) => a - b);

    let week = 0;
    for (let i = 0; i < 7; i++) week += addedOn(dateKey(shiftDays(today, -i)));

    // 오늘 아직 안 썼어도 어제까지 이어졌으면 연속으로 본다
    let streak = 0;
    let cursor = addedOn(todayKey) > 0 ? today : shiftDays(today, -1);
    while (addedOn(dateKey(cursor)) > 0) {
        streak++;
        cursor = shiftDays(cursor, -1);
    }

    const focusKey = selectedKey ?? todayKey;
    const focusDay = days.find((d) => d.key === focusKey);
    const focusLog = logs.get(focusKey);
    const focusDate = focusDay
        ? t("activity_day", {
              m: focusDay.date.getMonth() + 1,
              d: focusDay.date.getDate(),
          })
        : "";

    const stats = [
        {
            label: t("activity_today"),
            value: t("activity_chars", {
                n: addedOn(todayKey).toLocaleString(),
            }),
        },
        {
            label: t("activity_week"),
            value: t("activity_chars", { n: week.toLocaleString() }),
        },
        {
            label: t("activity_streak"),
            value: t("activity_days", { n: streak }),
        },
    ];

    return (
        <DashboardCard title={t("activity_title")} icon={CalendarDays}>
            <dl className="mb-4 grid grid-cols-3 gap-2">
                {stats.map((s) => (
                    <div key={s.label}>
                        <dt className="text-xs text-zinc-500">{s.label}</dt>
                        <dd className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                            {s.value}
                        </dd>
                    </div>
                ))}
            </dl>

            <div
                className="grid grid-flow-col gap-[3px]"
                style={{
                    gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`,
                    gridTemplateRows: "repeat(7, auto)",
                }}
            >
                {days.map((day) =>
                    day.future ? (
                        <span key={day.key} className="aspect-square" />
                    ) : (
                        <button
                            key={day.key}
                            type="button"
                            aria-label={day.key}
                            onMouseEnter={() => setSelectedKey(day.key)}
                            onClick={() => setSelectedKey(day.key)}
                            className={`aspect-square rounded-[2px] ${LEVEL_CLASSES[levelOf(addedOn(day.key), sorted)]} ${
                                day.key === focusKey
                                    ? "ring-1 ring-zinc-900 ring-offset-1 ring-offset-white dark:ring-zinc-100 dark:ring-offset-zinc-950"
                                    : ""
                            }`}
                        />
                    ),
                )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="tabular-nums text-zinc-700 dark:text-zinc-300">
                    {focusLog
                        ? t("activity_dayDetail", {
                              date: focusDate,
                              added: focusLog.added.toLocaleString(),
                              removed: focusLog.removed.toLocaleString(),
                          })
                        : t("activity_dayEmpty", { date: focusDate })}
                </span>
                <span className="flex items-center gap-1 text-zinc-500">
                    {t("activity_less")}
                    {LEVEL_CLASSES.map((cls) => (
                        <span
                            key={cls}
                            className={`h-2.5 w-2.5 rounded-[2px] ${cls}`}
                        />
                    ))}
                    {t("activity_more")}
                </span>
            </div>
            <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
                {t("activity_note")}
            </p>
        </DashboardCard>
    );
}
