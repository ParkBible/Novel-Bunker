import type { BackupData } from "./backup";
import type { Scene } from "./index";

// 스냅샷 저장 시점에 계산해 두는 타임라인 요약값.
// db/index.ts의 마이그레이션에서도 쓰이므로 별도 모듈로 둔다.
// (여기서 index/backup은 타입만 가져와 런타임 순환 참조가 없다)

// 목록에 이름을 다 늘어놓을 수 없으니 앞의 몇 개만 저장한다.
const SCENE_NAMES_MAX = 3;

const plainLength = (html: string | undefined): number =>
    (html ?? "").replace(/<[^>]*>/g, "").length;

// 씬 제목은 비어 있을 수 있다. 표시용 문구는 로케일에 따라 달라지므로
// 여기서는 원본 그대로 두고 UI에서 폴백을 채운다.
type SceneRef = Pick<Scene, "title" | "chapterId" | "order">;

function toNames(refs: SceneRef[]): string[] {
    return [...refs]
        .sort((a, b) =>
            a.chapterId !== b.chapterId
                ? a.chapterId - b.chapterId
                : a.order - b.order,
        )
        .slice(0, SCENE_NAMES_MAX)
        .map((s) => s.title?.trim() ?? "");
}

export interface SnapshotStats {
    chars: number;
    added: number;
    removed: number;
    scenesChanged: number;
    changedScenes: string[];
}

export function computeStats(
    data: BackupData,
    prev: BackupData | null,
): SnapshotStats {
    const chars = data.scenes.reduce(
        (sum, s) => sum + plainLength(s.content),
        0,
    );

    if (!prev) {
        return {
            chars,
            added: chars,
            removed: 0,
            scenesChanged: data.scenes.length,
            changedScenes: toNames(data.scenes),
        };
    }

    const prevById = new Map(prev.scenes.map((s) => [s.id as number, s]));
    const currentIds = new Set(data.scenes.map((s) => s.id as number));

    let added = 0;
    let removed = 0;
    const changed: SceneRef[] = [];

    for (const scene of data.scenes) {
        const before = prevById.get(scene.id as number);
        const delta = plainLength(scene.content) - plainLength(before?.content);
        if (delta > 0) added += delta;
        else removed += -delta;
        // 길이가 같아도 내용이 바뀌었을 수 있으므로 문자열로 판정한다
        const isChanged =
            !before ||
            before.content !== scene.content ||
            before.title !== scene.title;
        if (isChanged) changed.push(scene);
    }
    for (const [id, scene] of prevById) {
        if (currentIds.has(id)) continue;
        removed += plainLength(scene.content);
        changed.push(scene); // 삭제된 씬도 변경으로 센다
    }

    return {
        chars,
        added,
        removed,
        scenesChanged: changed.length,
        changedScenes: toNames(changed),
    };
}
