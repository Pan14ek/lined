import { http, HttpResponse } from 'msw';
import { MOCK_USERS, MOCK_LOBBIES } from '../data';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export const userHandlers = [
  http.get(`${BASE}/users/:id`, ({ params }) => {
    const user = MOCK_USERS.find((u) => u.id === Number(params['id']));
    if (!user) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(user);
  }),

  http.get(`${BASE}/users/search`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase() ?? '';
    const matches = MOCK_USERS.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
    return HttpResponse.json({
      content: matches,
      page: 0,
      size: 20,
      totalElements: matches.length,
      totalPages: 1,
    });
  }),

  http.post(`${BASE}/users`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const taken = MOCK_USERS.some(
      (u) => u.username === body['username'] || u.email === body['email'],
    );
    if (taken) {
      return HttpResponse.json(
        { code: 'EMAIL_EXISTS', message: 'Username or email already registered' },
        { status: 409 },
      );
    }
    return HttpResponse.json(
      {
        id: 99,
        ...body,
        createdAt: new Date().toISOString(),
        roles: ['ROLE_USER'],
        activePlan: null,
        activeUntil: null,
      },
      { status: 201 },
    );
  }),

  http.delete(`${BASE}/users/:id`, ({ params }) => {
    const user = MOCK_USERS.find((u) => u.id === Number(params['id']));
    if (!user) return new HttpResponse(null, { status: 404 });
    const ownsLobby = MOCK_LOBBIES.some((l) => l.ownerId === user.id);
    if (ownsLobby) {
      return HttpResponse.json(
        { code: 'CONFLICT', message: 'Account owns one or more lobbies' },
        { status: 409 },
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),
];
