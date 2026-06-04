import { http, HttpResponse } from 'msw';
import { MOCK_LOBBIES } from '../data';

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

  http.post(`${BASE}/lobbies/:id/members`, ({ params, request }) => {
    const lobby = MOCK_LOBBIES.find((l) => l.id === Number(params['id']));
    if (!lobby) return new HttpResponse(null, { status: 404 });
    const url = new URL(request.url);
    const userId = Number(url.searchParams.get('userId'));
    return HttpResponse.json({
      ...lobby,
      memberIds: [...lobby.memberIds, userId],
    });
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
