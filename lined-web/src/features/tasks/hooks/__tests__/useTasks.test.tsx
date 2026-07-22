import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/test/server';
import { QUERY_KEYS } from '@/features/tasks/lib/constants';
import type { TaskDto } from '@/features/tasks/model';
import { useDeleteTask, useUpdateTask, useUpdateTaskStatus } from '../useTasks';
import { HTTP_STATUS } from '@/test/httpStatus';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const makeTask = (overrides: Partial<TaskDto>): TaskDto => ({
  id: 1,
  title: 'Task',
  description: null,
  priority: 'MEDIUM',
  status: 'TODO',
  lobbyId: 1,
  creatorId: 1,
  assigneeId: null,
  dueDate: null,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useUpdateTaskStatus', () => {
  it('patches both the myTasks cache and any cached lobbyTasks list', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const task = makeTask({ id: 1, lobbyId: 1, status: 'TODO' });
    queryClient.setQueryData(QUERY_KEYS.myTasks, [task]);
    queryClient.setQueryData(QUERY_KEYS.lobbyTasks(1), [task]);
    server.use(
      http.patch(`${BASE}/tasks/:id`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...task, ...body });
      }),
    );

    const { result } = renderHook(() => useUpdateTaskStatus(), {
      wrapper: makeWrapper(queryClient),
    });
    result.current.mutate({ id: 1, status: 'IN_PROGRESS' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData<TaskDto[]>(QUERY_KEYS.myTasks)?.[0]?.status).toBe(
      'IN_PROGRESS',
    );
    expect(queryClient.getQueryData<TaskDto[]>(QUERY_KEYS.lobbyTasks(1))?.[0]?.status).toBe(
      'IN_PROGRESS',
    );
  });
});

describe('useUpdateTask', () => {
  it('patches the myTasks cache and any cached lobbyTasks list with the server response', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const task = makeTask({ id: 1, lobbyId: 1, title: 'Original title' });
    queryClient.setQueryData(QUERY_KEYS.myTasks, [task]);
    queryClient.setQueryData(QUERY_KEYS.lobbyTasks(1), [task]);
    server.use(
      http.patch(`${BASE}/tasks/:id`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...task, ...body });
      }),
    );

    const { result } = renderHook(() => useUpdateTask(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate({ id: 1, data: { title: 'Updated title' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData<TaskDto[]>(QUERY_KEYS.myTasks)?.[0]?.title).toBe(
      'Updated title',
    );
    expect(queryClient.getQueryData<TaskDto[]>(QUERY_KEYS.lobbyTasks(1))?.[0]?.title).toBe(
      'Updated title',
    );
  });

  it('rolls back every cached task list when the request fails', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const task = makeTask({ id: 1, lobbyId: 1, title: 'Original title' });
    queryClient.setQueryData(QUERY_KEYS.myTasks, [task]);
    queryClient.setQueryData(QUERY_KEYS.lobbyTasks(1), [task]);
    server.use(http.patch(`${BASE}/tasks/:id`, () => new HttpResponse(null, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })));

    const { result } = renderHook(() => useUpdateTask(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate({ id: 1, data: { title: 'Updated title' } });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<TaskDto[]>(QUERY_KEYS.myTasks)?.[0]?.title).toBe(
      'Original title',
    );
    expect(queryClient.getQueryData<TaskDto[]>(QUERY_KEYS.lobbyTasks(1))?.[0]?.title).toBe(
      'Original title',
    );
  });
});

describe('useDeleteTask', () => {
  it('removes the task from both the myTasks cache and any cached lobbyTasks list', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const task = makeTask({ id: 1, lobbyId: 1 });
    queryClient.setQueryData(QUERY_KEYS.myTasks, [task]);
    queryClient.setQueryData(QUERY_KEYS.lobbyTasks(1), [task]);
    server.use(http.delete(`${BASE}/tasks/:id`, () => new HttpResponse(null, { status: HTTP_STATUS.NO_CONTENT })));

    const { result } = renderHook(() => useDeleteTask(), { wrapper: makeWrapper(queryClient) });
    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData<TaskDto[]>(QUERY_KEYS.myTasks)).toEqual([]);
    expect(queryClient.getQueryData<TaskDto[]>(QUERY_KEYS.lobbyTasks(1))).toEqual([]);
  });
});
