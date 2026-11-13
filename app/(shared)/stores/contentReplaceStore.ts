import { create } from "zustand";

// Drive 받기·버전 복원처럼 로컬 데이터를 통째로 갈아끼우는 동안의 상태.
// 입력 중인 칸은 바깥 변경을 반영하지 않으므로(타이핑 중 덮어쓰기 방지), 갈아끼운 뒤
// 옛 내용을 든 채 남아 있다가 그대로 저장해 새 내용을 덮어쓸 수 있다. 이를 막으려고
// 적용 중엔 본문 입력을 잠그고, 끝나면 입력 중인 칸도 새 내용으로 강제로 맞춘다.
interface ContentReplaceState {
    // 갈아끼우기가 끝날 때마다 1씩 오른다. 입력 칸은 이 값이 바뀌면 새 내용을 받아들인다
    revision: number;
    // 진행 중인 갈아끼우기 개수 (0이면 입력 가능)
    replacingCount: number;
}

export const useContentReplaceStore = create<ContentReplaceState>(() => ({
    revision: 0,
    replacingCount: 0,
}));

/**
 * 로컬 데이터를 갈아끼우고 화면을 다시 불러오는 작업을 감싼다.
 * apply 안에서 화면 데이터(스토어) 재로드까지 끝내야 입력 칸이 새 내용을 받는다.
 * 실패하면 갈아끼워지지 않은 것으로 보고 입력 칸을 건드리지 않는다.
 */
export async function replaceContent<T>(apply: () => Promise<T>): Promise<T> {
    useContentReplaceStore.setState((s) => ({
        replacingCount: s.replacingCount + 1,
    }));
    let replaced = false;
    try {
        const result = await apply();
        replaced = true;
        return result;
    } finally {
        useContentReplaceStore.setState((s) => ({
            replacingCount: s.replacingCount - 1,
            revision: replaced ? s.revision + 1 : s.revision,
        }));
    }
}
