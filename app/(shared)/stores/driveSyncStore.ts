import { create } from "zustand";

// Drive 동기화 패널은 데스크톱·모바일 레이아웃에 동시에 붙어 있을 수 있다.
// 원격 확인은 한 곳에서만 돌리므로, 그 결과를 모든 패널이 같이 보도록 여기에 둔다.
interface DriveSyncState {
    // 이 기기와 다른 기기가 둘 다 바뀌어 사용자가 골라야 하는 상태
    isRemoteStale: boolean;
    remoteModifiedAt: Date | null;
    // 다른 기기에서 바뀐 내용을 자동으로 받아 온 시각
    autoPulledAt: Date | null;
    setRemoteStale: (modifiedAt: Date | null) => void;
    clearRemoteStale: () => void;
    setAutoPulled: (at: Date | null) => void;
}

export const useDriveSyncStore = create<DriveSyncState>((set) => ({
    isRemoteStale: false,
    remoteModifiedAt: null,
    autoPulledAt: null,
    setRemoteStale: (modifiedAt) =>
        set({ isRemoteStale: true, remoteModifiedAt: modifiedAt }),
    clearRemoteStale: () =>
        set({ isRemoteStale: false, remoteModifiedAt: null }),
    setAutoPulled: (at) => set({ autoPulledAt: at }),
}));
