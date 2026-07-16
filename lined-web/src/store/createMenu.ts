import { create } from 'zustand';

export type CreateOverlay = 'event' | 'task' | 'reserveSlot' | null;

interface CreateMenuState {
  isCreateLobbyOpen: boolean;
  openCreateLobby: () => void;
  closeCreateLobby: () => void;
  overlay: CreateOverlay;
  openOverlay: (overlay: Exclude<CreateOverlay, null>) => void;
  closeOverlay: () => void;
}

export const useCreateMenuStore = create<CreateMenuState>()((set) => ({
  isCreateLobbyOpen: false,
  openCreateLobby: () => set({ isCreateLobbyOpen: true }),
  closeCreateLobby: () => set({ isCreateLobbyOpen: false }),
  overlay: null,
  openOverlay: (overlay) => set({ overlay }),
  closeOverlay: () => set({ overlay: null }),
}));
