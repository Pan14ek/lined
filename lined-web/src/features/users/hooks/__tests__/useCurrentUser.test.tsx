import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCurrentUser } from '../useCurrentUser';
import { useAuthStore } from '@/store/auth';

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCurrentUser', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'mock-token-1', status: 'authenticated' });
  });

  it('loads the current user from users/me using the access token', async () => {
    const { result } = renderHook(() => useCurrentUser(), { wrapper: createWrapper() });

    await waitFor(() => {
      if (!result.current.isSuccess) throw new Error('current user has not loaded');
    });

    expect.assertions(2);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toMatchObject({ id: 1, username: 'alex_johnson' });
  });
});
