import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/test/server';
import { QUERY_KEYS } from '@/features/lobby/lib/constants';
import type { LobbyInviteDto } from '@/features/lobby/model';
import { useMyInvites, useAcceptInvite, useDeclineInvite, useCancelInvite } from '../useInvites';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const makeWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const makeQueryClient = () => {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

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

const invite: LobbyInviteDto = {
  id: 1,
  lobbyId: 3,
  inviterId: 1,
  inviteeId: 2,
  status: 'PENDING',
  sentAt: '2026-07-15T10:00:00Z',
  createdAt: '2026-07-15T10:00:00Z',
  updatedAt: '2026-07-15T10:00:00Z',
};

describe('useMyInvites', () => {
  it('fetches the current user pending invites', async () => {
    expect.assertions(2);
    const queryClient = makeQueryClient();

    const { result } = renderHook(() => useMyInvites(), { wrapper: makeWrapper(queryClient) });
    await waitUntilSettled(result);

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toHaveLength(3);
  });

  it('surfaces a failed request as an error state', async () => {
    expect.assertions(1);
    const queryClient = makeQueryClient();
    server.use(http.get(`${BASE}/lobby-invites/mine`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })));

    const { result } = renderHook(() => useMyInvites(), { wrapper: makeWrapper(queryClient) });
    await waitUntilSettled(result);

    expect(result.current.isError).toBe(true);
  });
});

describe('useAcceptInvite', () => {
  it('removes the invite from the myInvites cache and invalidates lobbies on success', async () => {
    expect.assertions(2);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEYS.myInvites, [invite]);
    queryClient.setQueryData(QUERY_KEYS.lobbies, []);

    const { result } = renderHook(() => useAcceptInvite(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate(invite.id);
    await waitUntilSettled(result);

    expect(queryClient.getQueryData(QUERY_KEYS.myInvites)).toEqual([]);
    expect(queryClient.getQueryState(QUERY_KEYS.lobbies)?.isInvalidated).toBe(true);
  });

  it('rejects with a 409 when the invite is no longer pending', async () => {
    expect.assertions(1);
    const queryClient = makeQueryClient();
    server.use(
      http.post(`${BASE}/lobby-invites/:inviteId/accept`, () =>
        HttpResponse.json({ code: 'CONFLICT', message: 'Invite is no longer pending' }, { status: HTTP_STATUS.CONFLICT }),
      ),
    );

    const { result } = renderHook(() => useAcceptInvite(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate(invite.id);
    await waitUntilSettled(result);

    expect(result.current.isError).toBe(true);
  });

  it('removes the stale invite from the myInvites cache on a 404', async () => {
    expect.assertions(2);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEYS.myInvites, [invite]);
    server.use(
      http.post(`${BASE}/lobby-invites/:inviteId/accept`, () => new HttpResponse(null, { status: HTTP_STATUS.NOT_FOUND })),
    );

    const { result } = renderHook(() => useAcceptInvite(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate(invite.id);
    await waitUntilSettled(result);

    expect(result.current.isError).toBe(true);
    expect(queryClient.getQueryData(QUERY_KEYS.myInvites)).toEqual([]);
  });
});

describe('useDeclineInvite', () => {
  it('removes the invite from the myInvites cache on success', async () => {
    expect.assertions(1);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEYS.myInvites, [invite]);

    const { result } = renderHook(() => useDeclineInvite(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate(invite.id);
    await waitUntilSettled(result);

    expect(queryClient.getQueryData(QUERY_KEYS.myInvites)).toEqual([]);
  });

  it('rejects with a 409 when the invite is no longer pending', async () => {
    expect.assertions(1);
    const queryClient = makeQueryClient();
    server.use(
      http.post(`${BASE}/lobby-invites/:inviteId/decline`, () =>
        HttpResponse.json({ code: 'CONFLICT', message: 'Invite is no longer pending' }, { status: HTTP_STATUS.CONFLICT }),
      ),
    );

    const { result } = renderHook(() => useDeclineInvite(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate(invite.id);
    await waitUntilSettled(result);

    expect(result.current.isError).toBe(true);
  });
});

describe('useCancelInvite', () => {
  it('refetches the lobby invite list on a 404 so a stale cross-lobby invite id drops out', async () => {
    expect.assertions(1);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEYS.lobbyInvites(3), [invite]);
    server.use(
      http.delete(`${BASE}/lobbies/:lobbyId/invites/:inviteId`, () => new HttpResponse(null, { status: HTTP_STATUS.NOT_FOUND })),
      http.get(`${BASE}/lobbies/:lobbyId/invites`, () => HttpResponse.json([])),
    );

    const { result } = renderHook(() => useCancelInvite(3), { wrapper: makeWrapper(queryClient) });
    result.current.mutate(invite.id);
    await waitUntilSettled(result);

    expect(queryClient.getQueryState(QUERY_KEYS.lobbyInvites(3))?.isInvalidated).toBe(true);
  });
});
