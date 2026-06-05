import { http, HttpResponse } from 'msw';
import { MOCK_TASKS } from '../data';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export const taskHandlers = [
  http.get(`${BASE}/tasks`, ({ request }) => {
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

  http.post(`${BASE}/tasks`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        id: 100,
        status: 'TODO',
        creatorId: 1,
        assigneeId: null,
        dueDate: null,
        createdAt: new Date().toISOString(),
        ...body,
      },
      { status: 201 },
    );
  }),

  http.patch(`${BASE}/tasks/:id`, async ({ params, request }) => {
    const task = MOCK_TASKS.find((t) => t.id === Number(params['id']));
    if (!task) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...task, ...body });
  }),

  http.delete(`${BASE}/tasks/:id`, ({ params }) => {
    const exists = MOCK_TASKS.some((t) => t.id === Number(params['id']));
    if (!exists) return new HttpResponse(null, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),
];
