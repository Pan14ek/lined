import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/auth';
import { getErrorStatus } from '@/lib/apiClient';
import { HTTP_STATUS } from '@/lib/httpStatus';
import { QUERY_KEYS } from '@/features/calendar/lib/constants';
import { MOCK_EVENTS } from '@/features/calendar/api/mockData';
import type { EventDto } from '@/features/calendar/model';
import { server } from '@/test/server';
import { useDeleteEvent, useRangeEvents, useUpdateEvent } from '../useEvents';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const makeWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const newQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

// MOCK_EVENTS fixtures 14/15 are private events owned by user 1 and user 2
// respectively, both in lobby 1 (see mockData.ts).
describe('useRangeEvents — private event privacy filter', () => {
  it("includes the requester's own private event but never another member's", async () => {
    useAuthStore.setState({ accessToken: 'mock-token-1', status: 'authenticated' });
    const { result } = renderHook(() => useRangeEvents(new Date('2026-01-01'), new Date('2027-01-01')), {
      wrapper: makeWrapper(newQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const titles = result.current.data?.map((e) => e.title) ?? [];
    expect(titles).toContain('Pick up the gift'); // user 1's own private event
    expect(titles).not.toContain('Therapy appointment'); // user 2's private event
  });

  it("excludes both members' private events from a non-member/no-session view", async () => {
    useAuthStore.setState({ accessToken: null, status: 'unauthenticated' });
    const { result } = renderHook(() => useRangeEvents(new Date('2026-01-01'), new Date('2027-01-01')), {
      wrapper: makeWrapper(newQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const titles = result.current.data?.map((e) => e.title) ?? [];
    expect(titles).not.toContain('Pick up the gift');
    expect(titles).not.toContain('Therapy appointment');
  });
});

describe('useUpdateEvent — unauthorized private access', () => {
  it("404s a non-owner's attempt to update another member's private event, with no private-specific message", async () => {
    useAuthStore.setState({ accessToken: 'mock-token-1', status: 'authenticated' }); // event 15 is owned by user 2
    const { result } = renderHook(() => useUpdateEvent(), { wrapper: makeWrapper(newQueryClient()) });

    result.current.mutate({ id: 15, data: { title: 'Snooping' } });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getErrorStatus(result.current.error)).toBe(404);
    // The 404 body carries no body at all — nothing that could leak a
    // "this is private" message to the caller.
    expect((result.current.error as Error).message).not.toMatch(/private/i);
  });

  it('removes the stale event from every cached event list on a 404 instead of leaving it visible', async () => {
    useAuthStore.setState({ accessToken: 'mock-token-1', status: 'authenticated' });
    const queryClient = newQueryClient();
    const cachedKey = [...QUERY_KEYS.events, 'range', 'x', 'y'];
    queryClient.setQueryData<EventDto[]>(cachedKey, [
      { id: 15, title: 'Therapy appointment' } as EventDto,
    ]);
    const { result } = renderHook(() => useUpdateEvent(), { wrapper: makeWrapper(queryClient) });

    result.current.mutate({ id: 15, data: { title: 'Snooping' } });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<EventDto[]>(cachedKey)).toEqual([]);
  });
});

describe('useDeleteEvent — optimistic locking', () => {
  it('sends the event version as a quoted If-Match header', async () => {
    useAuthStore.setState({ accessToken: 'mock-token-1', status: 'authenticated' });
    let receivedIfMatch: string | null = null;
    server.use(
      http.delete(`${BASE}/calendar/events/:id`, ({ request }) => {
        receivedIfMatch = request.headers.get('If-Match');
        return new HttpResponse(null, { status: HTTP_STATUS.NO_CONTENT });
      }),
    );

    const { result } = renderHook(() => useDeleteEvent(), { wrapper: makeWrapper(newQueryClient()) });
    result.current.mutate({ id: 1, version: 7 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(receivedIfMatch).toBe('"7"');
  });
});

describe('useUpdateEvent — optimistic locking', () => {
  it('sends the event version as a quoted If-Match header', async () => {
    useAuthStore.setState({ accessToken: 'mock-token-1', status: 'authenticated' });
    let receivedIfMatch: string | null = null;
    server.use(
      http.patch(`${BASE}/calendar/events/:id`, ({ request }) => {
        receivedIfMatch = request.headers.get('If-Match');
        return HttpResponse.json({ ...MOCK_EVENTS[0], title: 'Updated title', version: 8 });
      }),
    );

    const { result } = renderHook(() => useUpdateEvent(), { wrapper: makeWrapper(newQueryClient()) });
    result.current.mutate({ id: 1, version: 7, data: { title: 'Updated title' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(receivedIfMatch).toBe('"7"');
  });
});
