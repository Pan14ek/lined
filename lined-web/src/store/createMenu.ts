import { create } from 'zustand';
import type { TaskStatus } from '@/types';

export type CreateOverlay = 'event' | 'task' | 'reserveSlot' | null;

/** A concrete or partial slot to seed ReserveSlotModal from. */
export interface ReserveSlotInitial {
  /** Omitted when the click site doesn't know which lobby (global calendar free-band). */
  lobbyId?: number;
  start: string;
  end: string;
}

interface CreateMenuState {
  isCreateLobbyOpen: boolean;
  openCreateLobby: () => void;
  closeCreateLobby: () => void;
  overlay: CreateOverlay;
  /** Preselected status for the 'task' overlay, e.g. when opened from a kanban column. */
  taskInitialStatus: TaskStatus | null;
  /** Preselected slot for the 'reserveSlot' overlay, e.g. from the dashboard banner or a free-band click. */
  reserveSlotInitial: ReserveSlotInitial | null;
  openOverlay: (overlay: Exclude<CreateOverlay, null>, taskInitialStatus?: TaskStatus) => void;
  openReserveSlot: (initial?: ReserveSlotInitial) => void;
  closeOverlay: () => void;
}

export const useCreateMenuStore = create<CreateMenuState>()((set) => ({
  isCreateLobbyOpen: false,
  openCreateLobby: () => set({ isCreateLobbyOpen: true }),
  closeCreateLobby: () => set({ isCreateLobbyOpen: false }),
  overlay: null,
  taskInitialStatus: null,
  reserveSlotInitial: null,
  openOverlay: (overlay, taskInitialStatus) => set({ overlay, taskInitialStatus: taskInitialStatus ?? null }),
  openReserveSlot: (initial) => set({ overlay: 'reserveSlot', reserveSlotInitial: initial ?? null }),
  closeOverlay: () => set({ overlay: null, taskInitialStatus: null, reserveSlotInitial: null }),
}));
