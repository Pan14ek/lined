import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/test/server';
import { QUERY_KEYS } from '@/features/notifications/lib/constants';
import type { NotificationDto } from '@/features/notifications/model';
import { useMarkNotificationRead } from '../useNotifications';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const makeWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const notification: NotificationDto = {
  id: 9001,
  type: 'TASK_ASSIGNED',
  title: 'Task assigned',
  message: 'You were assigned a task',
  lobbyId: 1,
  taskId: 5,
  eventId: null,
  readAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  deliveries: [],
};

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

describe('useMarkNotificationRead', () => {
  it('marks the matching notification as read on success', async () => {
    expect.assertions(1);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEYS.myNotifications, [notification]);
    server.use(
      http.patch(`${BASE}/notifications/:id/read`, () =>
        HttpResponse.json({ ...notification, readAt: '2026-01-02T00:00:00Z' }),
      ),
    );

    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate(notification.id);
    await waitUntilSettled(result);

    expect(queryClient.getQueryData<NotificationDto[]>(QUERY_KEYS.myNotifications)?.[0]?.readAt).toBe(
      '2026-01-02T00:00:00Z',
    );
  });

  it('removes the notification from the cached inbox instead of leaving it visible on a 404', async () => {
    expect.assertions(1);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(QUERY_KEYS.myNotifications, [notification]);
    server.use(
      http.patch(`${BASE}/notifications/:id/read`, () => new HttpResponse(null, { status: HTTP_STATUS.NOT_FOUND })),
    );

    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate(notification.id);
    await waitUntilSettled(result);

    expect(queryClient.getQueryData<NotificationDto[]>(QUERY_KEYS.myNotifications)).toEqual([]);
  });
});
