import { create } from 'zustand';

interface UiState {
  /** Off-canvas sidebar drawer, shown under `lg` in place of the fixed desktop sidebar. */
  isSidebarDrawerOpen: boolean;
  openSidebarDrawer: () => void;
  closeSidebarDrawer: () => void;
  toggleSidebarDrawer: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  isSidebarDrawerOpen: false,
  openSidebarDrawer: () => set({ isSidebarDrawerOpen: true }),
  closeSidebarDrawer: () => set({ isSidebarDrawerOpen: false }),
  toggleSidebarDrawer: () => set((s) => ({ isSidebarDrawerOpen: !s.isSidebarDrawerOpen })),
}));
