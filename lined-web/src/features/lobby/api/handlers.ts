import { http, HttpResponse } from 'msw';
import { mockNetworkDelay } from '@/lib/apiClient';
import { MOCK_LOBBIES, MOCK_FREE_SLOT, MOCK_LOBBY_INVITES } from './mockData';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export const lobbyHandlers = [
  http.get(`${BASE}/lobbies/mine`, async () => {
    await mockNetworkDelay();
    return HttpResponse.json(MOCK_LOBBIES);
  }),

  http.get(`${BASE}/lobbies/:id`, async ({ params }) => {
    await mockNetworkDelay();
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

  http.get(`${BASE}/lobbies/:id/free-slots`, async ({ params, request }) => {
    await mockNetworkDelay();
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
    if (lobby.ownerId === Number(params['userId'])) {
      return HttpResponse.json(
        { code: 'BAD_REQUEST', message: 'Owner cannot be removed from lobby' },
        { status: 400 },
      );
    }
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

  http.post(`${BASE}/lobbies/:lobbyId/invites`, ({ params, request }) => {
    const lobbyId = Number(params['lobbyId']);
    const lobby = MOCK_LOBBIES.find((l) => l.id === lobbyId);
    if (!lobby) return new HttpResponse(null, { status: 404 });

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const userEmail = url.searchParams.get('userEmail');
    const inviteeId = userId ? Number(userId) : 2;

    if (lobby.memberIds.includes(inviteeId)) {
      return HttpResponse.json(
        { code: 'CONFLICT', message: 'User is already a lobby member' },
        { status: 409 },
      );
    }
    const duplicate = MOCK_LOBBY_INVITES.some(
      (i) => i.lobbyId === lobbyId && i.inviteeId === inviteeId && i.status === 'PENDING',
    );
    if (duplicate) {
      return HttpResponse.json(
        { code: 'CONFLICT', message: 'A pending invite already exists for this user' },
        { status: 409 },
      );
    }
    if (!userId && !userEmail) {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Supply exactly one of userId or userEmail' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    return HttpResponse.json(
      {
        id: 500,
        lobbyId,
        inviterId: lobby.ownerId,
        inviteeId,
        status: 'PENDING',
        sentAt: now,
        createdAt: now,
        updatedAt: now,
      },
      { status: 201 },
    );
  }),

  http.get(`${BASE}/lobbies/:lobbyId/invites`, async ({ params }) => {
    await mockNetworkDelay();
    const lobbyId = Number(params['lobbyId']);
    return HttpResponse.json(
      MOCK_LOBBY_INVITES.filter((i) => i.lobbyId === lobbyId && i.status === 'PENDING'),
    );
  }),

  http.post(`${BASE}/lobbies/:lobbyId/invites/:inviteId/resend`, ({ params }) => {
    const invite = MOCK_LOBBY_INVITES.find((i) => i.id === Number(params['inviteId']));
    if (!invite) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ ...invite, sentAt: new Date().toISOString() });
  }),

  http.delete(`${BASE}/lobbies/:lobbyId/invites/:inviteId`, ({ params }) => {
    const exists = MOCK_LOBBY_INVITES.some((i) => i.id === Number(params['inviteId']));
    if (!exists) return new HttpResponse(null, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE}/lobby-invites/mine`, async () => {
    await mockNetworkDelay();
    return HttpResponse.json(MOCK_LOBBY_INVITES.filter((i) => i.status === 'PENDING'));
  }),

  http.post(`${BASE}/lobby-invites/:inviteId/accept`, ({ params }) => {
    const invite = MOCK_LOBBY_INVITES.find((i) => i.id === Number(params['inviteId']));
    if (!invite) return new HttpResponse(null, { status: 404 });
    if (invite.status !== 'PENDING') {
      return HttpResponse.json(
        { code: 'CONFLICT', message: 'Invite is no longer pending' },
        { status: 409 },
      );
    }
    return HttpResponse.json({ ...invite, status: 'ACCEPTED' });
  }),

  http.post(`${BASE}/lobby-invites/:inviteId/decline`, ({ params }) => {
    const invite = MOCK_LOBBY_INVITES.find((i) => i.id === Number(params['inviteId']));
    if (!invite) return new HttpResponse(null, { status: 404 });
    if (invite.status !== 'PENDING') {
      return HttpResponse.json(
        { code: 'CONFLICT', message: 'Invite is no longer pending' },
        { status: 409 },
      );
    }
    return HttpResponse.json({ ...invite, status: 'DECLINED' });
  }),
];
