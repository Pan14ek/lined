import { http, HttpResponse } from 'msw';
import { MOCK_USERS } from '../data';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export const authHandlers = [
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const identifier = String(body['identifier'] ?? '');
    const user = MOCK_USERS.find(
      (u) => u.username === identifier || u.email === identifier,
    );
    if (!user || body['password'] === '') {
      return HttpResponse.json(
        { title: 'Unauthorized', detail: 'Invalid email, username, or password' },
        { status: 401 },
      );
    }
    return HttpResponse.json({
      accessToken: `mock-token-${user.id}`,
      tokenType: 'Bearer',
      expiresIn: 3600,
      userId: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
    });
  }),

  http.post(`${BASE}/auth/password-reset-requests`, () => new HttpResponse(null, { status: 202 })),

  http.post(`${BASE}/auth/password-resets`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (body['token'] !== 'valid-token') {
      return HttpResponse.json(
        { title: 'Bad Request', detail: 'Invalid or expired reset token' },
        { status: 400 },
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),
];
