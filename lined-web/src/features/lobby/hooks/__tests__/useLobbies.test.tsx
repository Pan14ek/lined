import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/test/server';
import { QUERY_KEYS } from '@/features/lobby/lib/constants';
import { QUERY_KEYS as TASKS_QUERY_KEYS } from '@/features/tasks/lib/constants';
import type { LobbyDto } from '@/features/lobby/model';
import { useLobby, useDeleteLobby } from '../useLobbies';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const makeWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const lobby: LobbyDto = {
  id: 42,
  name: 'Family Makieiev',
  lobbyType: 'FAMILY',
  ownerId: 1,
  memberIds: [1, 2],
};

describe('useLobby — access revocation', () => {
  it('purges the stale lobby detail (and lobby-scoped task cache) once a cached lobby 404s', async () => {
    expect.assertions(2);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEYS.lobbyDetail(lobby.id), lobby);
    queryClient.setQueryData(TASKS_QUERY_KEYS.lobbyTasks(lobby.id), [{ id: 1 }]);
    server.use(http.get(`${BASE}/lobbies/:id`, () => new HttpResponse(null, { status: HTTP_STATUS.NOT_FOUND })));

    const { result } = renderHook(() => useLobby(lobby.id), { wrapper: makeWrapper(queryClient) });

    await waitFor(() => {
      if (!result.current.isError) throw new Error('not settled yet');
    });

    expect(queryClient.getQueryData(QUERY_KEYS.lobbyDetail(lobby.id))).toBeUndefined();
    expect(queryClient.getQueryData(TASKS_QUERY_KEYS.lobbyTasks(lobby.id))).toBeUndefined();
  });

  it('fetches a 404-ing lobby id exactly once — no retry loop and no confirmation refetch', async () => {
    expect.assertions(1);
    const queryClient = makeQueryClient();
    let requestCount = 0;
    server.use(
      http.get(`${BASE}/lobbies/:id`, () => {
        requestCount += 1;
        return new HttpResponse(null, { status: HTTP_STATUS.NOT_FOUND });
      }),
    );

    const { result } = renderHook(() => useLobby(lobby.id), { wrapper: makeWrapper(queryClient) });
    await waitFor(() => {
      if (result.current.isFetching) throw new Error('still fetching');
    });
    // Give a disabled, purged observer a moment to (incorrectly) refetch if it were going to.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(requestCount).toBe(1);
  });
});

describe('useDeleteLobby', () => {
  it('purges the deleted lobby detail and lobby-scoped task cache before invalidating the lobby list', async () => {
    expect.assertions(3);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEYS.lobbyDetail(lobby.id), lobby);
    queryClient.setQueryData(TASKS_QUERY_KEYS.lobbyTasks(lobby.id), [{ id: 1 }]);
    queryClient.setQueryData(QUERY_KEYS.lobbies, [lobby]);
    server.use(http.delete(`${BASE}/lobbies/:id`, () => new HttpResponse(null, { status: HTTP_STATUS.NO_CONTENT })));

    const { result } = renderHook(() => useDeleteLobby(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate(lobby.id);
    await waitFor(() => {
      if (!result.current.isSuccess) throw new Error('not settled yet');
    });

    expect(queryClient.getQueryData(QUERY_KEYS.lobbyDetail(lobby.id))).toBeUndefined();
    expect(queryClient.getQueryData(TASKS_QUERY_KEYS.lobbyTasks(lobby.id))).toBeUndefined();
    expect(queryClient.getQueryState(QUERY_KEYS.lobbies)?.isInvalidated).toBe(true);
  });
});
