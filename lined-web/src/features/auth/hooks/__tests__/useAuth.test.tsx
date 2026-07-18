import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSignIn, useSignUp } from '../useAuth';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// waitFor polls its callback until it stops throwing; asserting with `expect`
// directly inside it would inflate expect.assertions() by one call per poll,
// so settle on a plain predicate first and assert once afterwards.
const waitUntilSettled = async (result: { current: { isSuccess: boolean; isError: boolean } }) => {
  await waitFor(() => {
    if (!result.current.isSuccess && !result.current.isError) {
      throw new Error('mutation has not settled yet');
    }
  });
}

describe('useSignIn', () => {
  it('resolves with the login response for a known identifier', async () => {
    expect.assertions(2);
    const { result } = renderHook(() => useSignIn(), { wrapper: createWrapper() });

    result.current.mutate({ identifier: 'alex@lined.app', password: 'password123' });
    await waitUntilSettled(result);

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data?.userId).toBe(1);
  });

  it('sets an error for an unknown identifier', async () => {
    expect.assertions(1);
    const { result } = renderHook(() => useSignIn(), { wrapper: createWrapper() });

    result.current.mutate({ identifier: 'nobody@lined.app', password: 'password123' });
    await waitUntilSettled(result);

    expect(result.current.isError).toBe(true);
  });
});

describe('useSignUp', () => {
  it('resolves with the created user for a new account', async () => {
    expect.assertions(2);
    const { result } = renderHook(() => useSignUp(), { wrapper: createWrapper() });

    result.current.mutate({
      username: 'new_user',
      email: 'new_user@lined.app',
      password: 'strongpass1',
    });
    await waitUntilSettled(result);

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data?.id).toBe(99);
  });

  it('sets an error for an already-taken username', async () => {
    expect.assertions(1);
    const { result } = renderHook(() => useSignUp(), { wrapper: createWrapper() });

    result.current.mutate({
      username: 'alex_johnson',
      email: 'alex@lined.app',
      password: 'strongpass1',
    });
    await waitUntilSettled(result);

    expect(result.current.isError).toBe(true);
  });
});
