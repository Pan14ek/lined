import { create } from 'zustand';

interface CreateMenuState {
  isCreateLobbyOpen: boolean;
  openCreateLobby: () => void;
  closeCreateLobby: () => void;
}

export const useCreateMenuStore = create<CreateMenuState>()((set) => ({
  isCreateLobbyOpen: false,
  openCreateLobby: () => set({ isCreateLobbyOpen: true }),
  closeCreateLobby: () => set({ isCreateLobbyOpen: false }),
}));
