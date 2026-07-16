import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  userId: number | null;
  token: string | null;
  setUserId: (id: number | null) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      token: null,
      setUserId: (id) => set({ userId: id }),
      setToken: (token) => set({ token }),
    }),
    { name: 'lined-auth' },
  ),
);
