import type { BackupData } from "../db/backup";
import type { Chapter, Project, Scene } from "../db/index";
import { plainLength } from "../db/snapshotStats";
import { diffScenes, type SceneDiff } from "./diff";

// Drive 백업은 DB 전체(모든 작품)를 한 파일에 담고, 받기는 그 파일로 로컬을
// 통째로 덮어쓴다. 그래서 "무엇이 바뀌는지"는 작품 단위로 갈라 보여줘야
// 지금 보고 있지 않은 작품까지 바뀐다는 사실이 드러난다.

export type ProjectDiffStatus = "added" | "removed" | "modified" | "unchanged";

// 소속 작품을 못 찾은 씬을 모아두는 가상 작품 id.
// (구버전 백업이나 작품 레코드가 유실된 데이터 대비)
const ORPHAN_PROJECT_ID = -1;

export interface SceneChange {
    diff: SceneDiff;
    chapterTitle: string;
    // 이 씬 하나의 글자 증감 (본문 기준, 태그 제외)
    addedChars: number;
    removedChars: number;
}

export interface ProjectDiff {
    projectId: number;
    title: string;
    status: ProjectDiffStatus;
    addedChars: number;
    removedChars: number;
    // 변경된 씬만. 안 바뀐 씬은 미리보기에 넣지 않는다
    changedScenes: SceneChange[];
}

function toMap<T extends { id?: number }>(items: T[] | undefined) {
    return new Map((items ?? []).map((i) => [i.id as number, i]));
}

// 씬/챕터에 projectId가 없거나(구버전) 가리키는 작품이 없으면 orphan으로 보낸다.
function resolveProjectId(
    scene: Scene | undefined,
    chapters: Map<number, Chapter>,
): number {
    if (!scene) return ORPHAN_PROJECT_ID;
    if (typeof scene.projectId === "number") return scene.projectId;
    const chapter = chapters.get(scene.chapterId);
    return typeof chapter?.projectId === "number"
        ? chapter.projectId
        : ORPHAN_PROJECT_ID;
}

function settingValue(data: BackupData, key: string): string {
    return data.settings?.find((s) => s.key === key)?.value ?? "";
}

/**
 * 두 백업을 작품 단위로 비교한다.
 * @param before 지금 이 기기의 상태
 * @param after 적용하면 이렇게 되는 상태 (받으려는 원격 백업)
 * @returns 바뀌는 작품이 앞에 오도록 정렬된 목록
 */
export function diffByProject(
    before: BackupData,
    after: BackupData,
): ProjectDiff[] {
    const sceneDiffs = diffScenes(before, after);

    const beforeScenes = toMap<Scene>(before.scenes);
    const afterScenes = toMap<Scene>(after.scenes);
    const beforeChapters = toMap<Chapter>(before.chapters);
    const afterChapters = toMap<Chapter>(after.chapters);
    const beforeProjects = toMap<Project>(before.projects);
    const afterProjects = toMap<Project>(after.projects);

    // 사라지는 씬의 챕터 제목은 before에만 있으므로 양쪽을 합쳐 둔다
    const chapterTitle = (id: number): string =>
        afterChapters.get(id)?.title ?? beforeChapters.get(id)?.title ?? "";
    const chapterOrder = (id: number): number =>
        afterChapters.get(id)?.order ?? beforeChapters.get(id)?.order ?? 0;

    const buckets = new Map<number, ProjectDiff>();
    const bucket = (id: number): ProjectDiff => {
        let entry = buckets.get(id);
        if (!entry) {
            entry = {
                projectId: id,
                title: "",
                status: "unchanged",
                addedChars: 0,
                removedChars: 0,
                changedScenes: [],
            };
            buckets.set(id, entry);
        }
        return entry;
    };

    // 작품 자체의 등장/소멸을 먼저 잡는다 (씬이 하나도 없는 작품도 드러나도록)
    for (const [id, project] of afterProjects) {
        const entry = bucket(id);
        entry.title = project.title;
        entry.status = beforeProjects.has(id) ? "unchanged" : "added";
    }
    for (const [id, project] of beforeProjects) {
        if (afterProjects.has(id)) continue;
        const entry = bucket(id);
        entry.title = project.title;
        entry.status = "removed";
    }

    for (const diff of sceneDiffs) {
        const afterScene = afterScenes.get(diff.sceneId);
        const beforeScene = beforeScenes.get(diff.sceneId);
        const projectId = resolveProjectId(
            afterScene ?? beforeScene,
            afterScene ? afterChapters : beforeChapters,
        );
        const entry = bucket(projectId);

        const delta =
            plainLength(afterScene?.content) -
            plainLength(beforeScene?.content);
        const addedChars = delta > 0 ? delta : 0;
        const removedChars = delta < 0 ? -delta : 0;
        entry.addedChars += addedChars;
        entry.removedChars += removedChars;

        if (diff.status === "unchanged") continue;
        entry.changedScenes.push({
            diff,
            chapterTitle: chapterTitle(diff.chapterId),
            addedChars,
            removedChars,
        });
        // 사라지는 작품은 그 상태를 유지한다 (씬이 바뀌었다고 덮어쓰지 않음)
        if (entry.status === "unchanged") entry.status = "modified";
    }

    // 씬은 안 바뀌었어도 제목/시놉시스가 바뀌면 그 작품도 달라진 것이다
    for (const [id, project] of afterProjects) {
        const prev = beforeProjects.get(id);
        if (!prev) continue;
        const entry = bucket(id);
        if (entry.status !== "unchanged") continue;
        if (
            prev.title !== project.title ||
            prev.synopsis !== project.synopsis
        ) {
            entry.status = "modified";
        }
    }

    for (const entry of buckets.values()) {
        entry.changedScenes.sort((a, b) => {
            const chapterDelta =
                chapterOrder(a.diff.chapterId) - chapterOrder(b.diff.chapterId);
            return chapterDelta !== 0
                ? chapterDelta
                : a.diff.order - b.diff.order;
        });
        // 작품 레코드가 없는 백업(구버전)은 설정의 작품 제목으로 메운다
        if (!entry.title) {
            entry.title =
                settingValue(after, "novelTitle") ||
                settingValue(before, "novelTitle");
        }
    }

    const rank: Record<ProjectDiffStatus, number> = {
        removed: 0,
        added: 1,
        modified: 2,
        unchanged: 3,
    };
    const order = (id: number): number =>
        afterProjects.get(id)?.order ?? beforeProjects.get(id)?.order ?? 0;

    return [...buckets.values()].sort((a, b) => {
        const byStatus = rank[a.status] - rank[b.status];
        return byStatus !== 0
            ? byStatus
            : order(a.projectId) - order(b.projectId);
    });
}
