import { http, HttpResponse } from 'msw';
import { MOCK_LOBBIES, MOCK_FREE_SLOT } from '../data';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export const lobbyHandlers = [
  http.get(`${BASE}/lobbies/mine`, () => {
    return HttpResponse.json(MOCK_LOBBIES);
  }),

  http.get(`${BASE}/lobbies/:id`, ({ params }) => {
    const lobby = MOCK_LOBBIES.find((l) => l.id === Number(params['id']));
    if (!lobby) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(lobby);
  }),

  http.post(`${BASE}/lobbies`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body['name'] === 'string' ? body['name'] : '';
    if (!name.trim()) {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'name must not be blank' },
        { status: 400 },
      );
    }
    return HttpResponse.json(
      {
        id: 100,
        ...body,
        ownerId: 1,
        memberIds: [1],
      },
      { status: 201 },
    );
  }),

  http.patch(`${BASE}/lobbies/:id`, async ({ params, request }) => {
    const lobby = MOCK_LOBBIES.find((l) => l.id === Number(params['id']));
    if (!lobby) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    if (body['ownerId'] != null && !lobby.memberIds.includes(Number(body['ownerId']))) {
      return HttpResponse.json(
        { code: 'CONFLICT', message: 'ownerId must be an existing lobby member' },
        { status: 409 },
      );
    }
    return HttpResponse.json({ ...lobby, ...body });
  }),

  http.get(`${BASE}/lobbies/:id/free-slots`, ({ params, request }) => {
    const lobby = MOCK_LOBBIES.find((l) => l.id === Number(params['id']));
    if (!lobby) return new HttpResponse(null, { status: 404 });
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (!from || !to) {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'from and to must define a non-empty window' },
        { status: 400 },
      );
    }
    const slots =
      MOCK_FREE_SLOT.start >= from && MOCK_FREE_SLOT.end <= to ? [MOCK_FREE_SLOT] : [];
    return HttpResponse.json(slots);
  }),

  http.delete(`${BASE}/lobbies/:lobbyId/members/:userId`, ({ params }) => {
    const lobby = MOCK_LOBBIES.find(
      (l) => l.id === Number(params['lobbyId']),
    );
    if (!lobby) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({
      ...lobby,
      memberIds: lobby.memberIds.filter(
        (id) => id !== Number(params['userId']),
      ),
    });
  }),

  http.delete(`${BASE}/lobbies/:id`, ({ params }) => {
    const exists = MOCK_LOBBIES.some((l) => l.id === Number(params['id']));
    if (!exists) return new HttpResponse(null, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),
];
