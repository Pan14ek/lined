import { create } from 'zustand';
import type { LobbyType } from '@/features/lobby/model';
import type { TaskDto, TaskStatus } from '@/features/tasks/model';

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
  /** Preselected type for the create-lobby modal, e.g. from the dashboard onboarding hero. */
  lobbyTypeInitial: LobbyType | null;
  openCreateLobby: (lobbyType?: LobbyType) => void;
  closeCreateLobby: () => void;
  overlay: CreateOverlay;
  /** Preselected status for the 'task' overlay, e.g. when opened from a kanban column. */
  taskInitialStatus: TaskStatus | null;
  /** When set, the 'task' overlay opens in edit mode, pre-filled from this task. */
  editingTask: TaskDto | null;
  /** Preselected slot for the 'reserveSlot' overlay, e.g. from the dashboard banner or a free-band click. */
  reserveSlotInitial: ReserveSlotInitial | null;
  openOverlay: (overlay: Exclude<CreateOverlay, null>, taskInitialStatus?: TaskStatus) => void;
  openTaskDetail: (task: TaskDto) => void;
  openReserveSlot: (initial?: ReserveSlotInitial) => void;
  closeOverlay: () => void;
}

export const useCreateMenuStore = create<CreateMenuState>()((set) => ({
  isCreateLobbyOpen: false,
  lobbyTypeInitial: null,
  openCreateLobby: (lobbyType) => set({ isCreateLobbyOpen: true, lobbyTypeInitial: lobbyType ?? null }),
  closeCreateLobby: () => set({ isCreateLobbyOpen: false, lobbyTypeInitial: null }),
  overlay: null,
  taskInitialStatus: null,
  editingTask: null,
  reserveSlotInitial: null,
  openOverlay: (overlay, taskInitialStatus) =>
    set({ overlay, taskInitialStatus: taskInitialStatus ?? null, editingTask: null }),
  openTaskDetail: (task) => set({ overlay: 'task', taskInitialStatus: null, editingTask: task }),
  openReserveSlot: (initial) => set({ overlay: 'reserveSlot', reserveSlotInitial: initial ?? null }),
  closeOverlay: () =>
    set({ overlay: null, taskInitialStatus: null, editingTask: null, reserveSlotInitial: null }),
}));
