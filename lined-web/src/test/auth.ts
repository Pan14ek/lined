import { useAuthStore } from '@/store/auth';

export const authenticateTestUser = (id = 1): void => {
  useAuthStore.setState({ accessToken: `mock-token-${id}`, status: 'authenticated' });
};

export const resetTestAuth = (): void => {
  useAuthStore.setState({ accessToken: null, status: 'unauthenticated' });
};
