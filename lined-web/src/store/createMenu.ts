import { create } from 'zustand';
import type { TaskStatus } from '@/types';

export type CreateOverlay = 'event' | 'task' | 'reserveSlot' | null;

interface CreateMenuState {
  isCreateLobbyOpen: boolean;
  openCreateLobby: () => void;
  closeCreateLobby: () => void;
  overlay: CreateOverlay;
  /** Preselected status for the 'task' overlay, e.g. when opened from a kanban column. */
  taskInitialStatus: TaskStatus | null;
  openOverlay: (overlay: Exclude<CreateOverlay, null>, taskInitialStatus?: TaskStatus) => void;
  closeOverlay: () => void;
}

export const useCreateMenuStore = create<CreateMenuState>()((set) => ({
  isCreateLobbyOpen: false,
  openCreateLobby: () => set({ isCreateLobbyOpen: true }),
  closeCreateLobby: () => set({ isCreateLobbyOpen: false }),
  overlay: null,
  taskInitialStatus: null,
  openOverlay: (overlay, taskInitialStatus) => set({ overlay, taskInitialStatus: taskInitialStatus ?? null }),
  closeOverlay: () => set({ overlay: null, taskInitialStatus: null }),
}));
