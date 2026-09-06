import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/test/server';
import { QUERY_KEYS } from '@/features/users/lib/constants';
import { MOCK_USERS } from '@/features/users/api/mockData';
import { useUpdateCurrentUser, useDeleteCurrentAccount } from '../useUserSettings';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const currentUser = MOCK_USERS[2]!; // owns no lobbies, so DELETE succeeds

const makeWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

// waitFor polls its callback until it stops throwing; asserting with `expect`
// directly inside it would inflate expect.assertions() by one call per poll,
// so settle on a plain predicate first and assert once afterwards.
const waitUntilSettled = async (result: { current: { isSuccess: boolean; isError: boolean } }) => {
  await waitFor(() => {
    if (!result.current.isSuccess && !result.current.isError) {
      throw new Error('not settled yet');
    }
  });
}

describe('useUpdateCurrentUser', () => {
  it('PATCHes the id resolved from the currentUser cache — never an arbitrary target id', async () => {
    expect.assertions(1);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEYS.currentUser, currentUser);
    let requestedId: string | undefined;
    server.use(
      http.patch(`${BASE}/users/:id`, async ({ params, request }) => {
        requestedId = params['id'] as string;
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...currentUser, ...body });
      }),
    );

    const { result } = renderHook(() => useUpdateCurrentUser(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate({ username: 'new_name' });
    await waitUntilSettled(result);

    expect(requestedId).toBe(String(currentUser.id));
  });

  it('updates the currentUser cache (not a generic user(id) entry) on success', async () => {
    expect.assertions(1);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEYS.currentUser, currentUser);
    server.use(
      http.patch(`${BASE}/users/:id`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...currentUser, ...body });
      }),
    );

    const { result } = renderHook(() => useUpdateCurrentUser(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate({ username: 'new_name' });
    await waitUntilSettled(result);

    expect(queryClient.getQueryData<{ username: string }>(QUERY_KEYS.currentUser)?.username).toBe(
      'new_name',
    );
  });

  it('also refreshes the public-directory projection of the same account (e.g. lobby member lists)', async () => {
    expect.assertions(1);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEYS.currentUser, currentUser);
    queryClient.setQueryData(QUERY_KEYS.user(currentUser.id), {
      id: currentUser.id,
      username: currentUser.username,
    });
    server.use(
      http.patch(`${BASE}/users/:id`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...currentUser, ...body });
      }),
    );

    const { result } = renderHook(() => useUpdateCurrentUser(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate({ username: 'new_name' });
    await waitUntilSettled(result);

    expect(
      queryClient.getQueryData<{ username: string }>(QUERY_KEYS.user(currentUser.id))?.username,
    ).toBe('new_name');
  });

  it('rejects without sending a request when no current user is loaded yet', async () => {
    expect.assertions(2);
    const queryClient = makeQueryClient();
    let called = false;
    server.use(
      http.patch(`${BASE}/users/:id`, () => {
        called = true;
        return HttpResponse.json(currentUser);
      }),
    );

    const { result } = renderHook(() => useUpdateCurrentUser(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate({ username: 'new_name' });
    await waitUntilSettled(result);

    expect(result.current.isError).toBe(true);
    expect(called).toBe(false);
  });
});

describe('useDeleteCurrentAccount', () => {
  it('DELETEs the id resolved from the currentUser cache and removes it on success', async () => {
    expect.assertions(1);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEYS.currentUser, currentUser);
    let requestedId: string | undefined;
    server.use(
      http.delete(`${BASE}/users/:id`, ({ params }) => {
        requestedId = params['id'] as string;
        return new HttpResponse(null, { status: HTTP_STATUS.NO_CONTENT });
      }),
    );

    const { result } = renderHook(() => useDeleteCurrentAccount(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate();
    await waitUntilSettled(result);

    expect(requestedId).toBe(String(currentUser.id));
  });
});
