"use client";

import { useTranslation } from "@/app/(shared)/i18n/TranslationProvider";
import type {
    DiffLine,
    EntryDiff,
    SceneDiff,
    SceneStatus,
} from "@/app/(shared)/utils/diff";
import { DiffLines } from "./DiffLines";

interface Props {
    scenes: SceneDiff[];
    lores: EntryDiff[];
    characters: EntryDiff[];
    versionLabel: string;
}

interface ChangedItem {
    key: string;
    title: string;
    status: Exclude<SceneStatus, "unchanged">;
    lines: DiffLine[];
}

function ChangeGroup({
    heading,
    items,
    newLabel,
}: {
    heading: string;
    items: ChangedItem[];
    newLabel: string;
}) {
    const t = useTranslation();
    if (items.length === 0) return null;

    return (
        <div className="flex flex-col gap-4">
            <h3 className="px-2 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                {heading}
            </h3>
            {items.map((item) => (
                <section key={item.key} className="flex flex-col gap-1.5">
                    <header className="flex items-center gap-1.5 border-b border-zinc-100 px-2 pb-1.5 dark:border-zinc-800">
                        {item.status === "added" && (
                            <span className="rounded bg-emerald-50 px-1 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                                {newLabel}
                            </span>
                        )}
                        {item.status === "removed" && (
                            <span className="rounded bg-red-50 px-1 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-950 dark:text-red-400">
                                {t("version_sceneDeleted")}
                            </span>
                        )}
                        <h4 className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-200">
                            {item.title}
                        </h4>
                    </header>
                    <DiffLines lines={item.lines} />
                </section>
            ))}
        </div>
    );
}

// 선택한 버전이 "이전", 현재 상태가 "이후"다. 줄 렌더링은 DiffLines가 맡는다.
export function VersionDiffViewer({
    scenes,
    lores,
    characters,
    versionLabel,
}: Props) {
    const t = useTranslation();

    const changedScenes: ChangedItem[] = scenes.flatMap((scene) =>
        scene.status === "unchanged"
            ? []
            : [
                  {
                      key: `scene-${scene.sceneId}`,
                      title: scene.title,
                      status: scene.status,
                      lines: scene.lines,
                  },
              ],
    );
    const toItems = (kind: string, entries: EntryDiff[]): ChangedItem[] =>
        entries.map((entry) => ({
            key: `${kind}-${entry.id}`,
            title: entry.title.trim() || t("version_untitledEntry"),
            status: entry.status,
            lines: entry.lines,
        }));
    const changedLores = toItems("lore", lores);
    const changedCharacters = toItems("character", characters);

    const counts = [
        changedScenes.length > 0 &&
            t("version_sceneCount", { n: changedScenes.length }),
        changedLores.length > 0 &&
            t("version_loreCount", { n: changedLores.length }),
        changedCharacters.length > 0 &&
            t("version_characterCount", { n: changedCharacters.length }),
    ].filter(Boolean);

    if (counts.length === 0) {
        return (
            <p className="py-10 text-center text-xs text-zinc-400">
                {t("version_noChanges")}
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* 어느 시점의 내용을 보고 있는지 스크롤해도 보이게 고정 */}
            <div className="sticky top-0 z-10 flex items-baseline gap-2 bg-white pb-2 pt-1 dark:bg-zinc-900">
                <span className="px-2 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
                    {versionLabel}
                </span>
                <span className="text-[11px] text-zinc-400">
                    {counts.join(" · ")}
                </span>
            </div>

            <p className="flex flex-wrap items-center gap-x-3 px-2 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                    <span className="inline-block size-2 rounded-sm bg-red-300 dark:bg-red-900" />
                    {t("version_legendRemoved")}
                </span>
                <span className="flex items-center gap-1">
                    <span className="inline-block size-2 rounded-sm bg-emerald-300 dark:bg-emerald-900" />
                    {t("version_legendAdded")}
                </span>
            </p>

            <ChangeGroup
                heading={t("version_groupScenes")}
                items={changedScenes}
                newLabel={t("version_sceneNew")}
            />
            <ChangeGroup
                heading={t("tree_lore")}
                items={changedLores}
                newLabel={t("version_entryNew")}
            />
            <ChangeGroup
                heading={t("tree_characters")}
                items={changedCharacters}
                newLabel={t("version_entryNew")}
            />
        </div>
    );
}
