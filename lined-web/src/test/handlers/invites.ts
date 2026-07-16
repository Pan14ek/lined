import { http, HttpResponse } from 'msw';
import { MOCK_LOBBY_INVITES, MOCK_LOBBIES } from '../data';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export const inviteHandlers = [
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

  http.get(`${BASE}/lobbies/:lobbyId/invites`, ({ params }) => {
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

  http.get(`${BASE}/lobby-invites/mine`, () => {
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
