import { http, HttpResponse } from 'msw';
import { mockNetworkDelay } from '@/lib/apiClient';
import { HTTP_STATUS } from '@/lib/httpStatus';
import { MOCK_USERS } from './mockData';
import { MOCK_LOBBIES } from '@/features/lobby/api/mockData';
import { getMockUserFromRequest } from '@/features/auth/api/mockIdentity';
import type { UserDto, UserPublicDto } from '@/features/users/model';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const toPublicDto = (user: UserDto): UserPublicDto => ({ id: user.id, username: user.username });

export const userHandlers = [
  http.get(`${BASE}/users/me`, async ({ request }) => {
    await mockNetworkDelay();
    const user = getMockUserFromRequest(request);
    if (!user) return new HttpResponse(null, { status: HTTP_STATUS.UNAUTHORIZED });
    return HttpResponse.json(user);
  }),

  // Must come before /users/:id — otherwise ":id" greedily matches the literal
  // "search" segment and this handler never runs.
  http.get(`${BASE}/users/search`, async ({ request }) => {
    await mockNetworkDelay();
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase() ?? '';
    const matches = MOCK_USERS.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
    return HttpResponse.json({
      content: matches.map(toPublicDto),
      page: 0,
      size: 20,
      totalElements: matches.length,
      totalPages: 1,
    });
  }),

  http.get(`${BASE}/users/:id`, async ({ params, request }) => {
    await mockNetworkDelay();
    const user = MOCK_USERS.find((u) => u.id === Number(params['id']));
    if (!user) return new HttpResponse(null, { status: HTTP_STATUS.NOT_FOUND });
    const requester = getMockUserFromRequest(request);
    if (requester?.id === user.id) return HttpResponse.json(user);
    return HttpResponse.json(toPublicDto(user));
  }),

  http.post(`${BASE}/users`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const taken = MOCK_USERS.some(
      (u) => u.username === body['username'] || u.email === body['email'],
    );
    if (taken) {
      return HttpResponse.json(
        { code: 'EMAIL_EXISTS', message: 'Username or email already registered' },
        { status: HTTP_STATUS.CONFLICT },
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
      { status: HTTP_STATUS.CREATED },
    );
  }),

  http.patch(`${BASE}/users/:id`, async ({ params, request }) => {
    const user = MOCK_USERS.find((u) => u.id === Number(params['id']));
    if (!user) return new HttpResponse(null, { status: HTTP_STATUS.NOT_FOUND });
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body['username'] === 'string' && !body['username'].trim()) {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'username must not be blank' },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }
    const taken = MOCK_USERS.some(
      (u) =>
        u.id !== user.id &&
        (u.username === body['username'] || u.email === body['email']),
    );
    if (taken) {
      return HttpResponse.json(
        { code: 'EMAIL_EXISTS', message: 'Username or email already registered' },
        { status: HTTP_STATUS.CONFLICT },
      );
    }
    return HttpResponse.json({ ...user, ...body });
  }),

  http.delete(`${BASE}/users/:id`, ({ params }) => {
    const user = MOCK_USERS.find((u) => u.id === Number(params['id']));
    if (!user) return new HttpResponse(null, { status: HTTP_STATUS.NOT_FOUND });
    const ownsLobby = MOCK_LOBBIES.some((l) => l.ownerId === user.id);
    if (ownsLobby) {
      return HttpResponse.json(
        { code: 'CONFLICT', message: 'Account owns one or more lobbies' },
        { status: HTTP_STATUS.CONFLICT },
      );
    }
    return new HttpResponse(null, { status: HTTP_STATUS.NO_CONTENT });
  }),
];
