import { http, HttpResponse } from 'msw';
import { mockNetworkDelay } from '@/lib/apiClient';
import { HTTP_STATUS } from '@/lib/httpStatus';
import { MOCK_TASKS } from './mockData';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export const taskHandlers = [
  http.get(`${BASE}/tasks`, async ({ request }) => {
    await mockNetworkDelay();
    const url = new URL(request.url);
    let tasks = [...MOCK_TASKS];

    const lobbyId = url.searchParams.get('lobbyId');
    if (lobbyId) tasks = tasks.filter((t) => t.lobbyId === Number(lobbyId));

    const assigneeId = url.searchParams.get('assigneeId');
    if (assigneeId)
      tasks = tasks.filter((t) => t.assigneeId === Number(assigneeId));

    const status = url.searchParams.get('status');
    if (status) tasks = tasks.filter((t) => t.status === status);

    return HttpResponse.json(tasks);
  }),

  http.get(`${BASE}/tasks/mine`, async () => {
    await mockNetworkDelay();
    return HttpResponse.json(MOCK_TASKS);
  }),

  http.post(`${BASE}/tasks`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body['title'] !== 'string' || body['title'].trim() === '') {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'title must not be blank' },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }
    return HttpResponse.json(
      {
        id: 100,
        description: null,
        priority: 'MEDIUM',
        status: 'TODO',
        creatorId: 1,
        assigneeId: null,
        dueDate: null,
        createdAt: new Date().toISOString(),
        ...body,
      },
      { status: HTTP_STATUS.CREATED },
    );
  }),

  http.patch(`${BASE}/tasks/:id`, async ({ params, request }) => {
    const task = MOCK_TASKS.find((t) => t.id === Number(params['id']));
    if (!task) return new HttpResponse(null, { status: HTTP_STATUS.NOT_FOUND });
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...task, ...body });
  }),

  http.delete(`${BASE}/tasks/:id`, ({ params }) => {
    const exists = MOCK_TASKS.some((t) => t.id === Number(params['id']));
    if (!exists) return new HttpResponse(null, { status: HTTP_STATUS.NOT_FOUND });
    return new HttpResponse(null, { status: HTTP_STATUS.NO_CONTENT });
  }),
];
