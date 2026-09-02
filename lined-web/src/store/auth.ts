import { create } from 'zustand';

export type AuthStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';

interface AuthState {
  accessToken: string | null;
  status: AuthStatus;
  setAccessToken: (accessToken: string) => void;
  finishBootstrap: () => void;
  clearAuthentication: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  status: 'bootstrapping',
  setAccessToken: (accessToken) => set({ accessToken, status: 'authenticated' }),
  finishBootstrap: () => set({ accessToken: null, status: 'unauthenticated' }),
  clearAuthentication: () => set({ accessToken: null, status: 'unauthenticated' }),
}));
