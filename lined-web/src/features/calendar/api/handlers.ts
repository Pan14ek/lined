import { http, HttpResponse } from 'msw';
import { mockNetworkDelay } from '@/lib/apiClient';
import { MOCK_EVENTS } from './mockData';
import type { EventDto } from '@/features/calendar/model';
import { getMockUserFromRequest } from '@/features/auth/api/mockIdentity';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

/** Mirrors the backend's owner-only rules (design §7.5/§7.6): a non-owner
 *  may neither read/mutate an already-private event nor flip a shared
 *  event they don't own to private. */
const isUnauthorizedVisibilityChange = (
  event: EventDto,
  requesterId: string | null,
  nextVisibility?: unknown,
): boolean => {
  if (String(event.ownerId) === requesterId) return false;
  if (event.visibility === 'PRIVATE') return true;
  return nextVisibility === 'PRIVATE';
}

export const eventHandlers = [
  http.get(`${BASE}/calendar/events`, async ({ request }) => {
    await mockNetworkDelay();
    const url = new URL(request.url);
    const requesterId = String(getMockUserFromRequest(request)?.id ?? '');
    let events = [...MOCK_EVENTS];

    // Requester-aware privacy filter, mirroring the backend: another
    // member's private event is never returned.
    events = events.filter(
      (e) => e.visibility !== 'PRIVATE' || String(e.ownerId) === requesterId,
    );

    const lobbyId = url.searchParams.get('lobbyId');
    if (lobbyId)
      events = events.filter((e) => e.lobbyId === Number(lobbyId));

    const from = url.searchParams.get('from');
    if (from) events = events.filter((e) => e.startAt >= from);

    const to = url.searchParams.get('to');
    if (to) events = events.filter((e) => e.endAt <= to);

    return HttpResponse.json(events);
  }),

  http.post(`${BASE}/calendar/events`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body['title'] !== 'string' || body['title'].trim() === '') {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'title must not be blank' },
        { status: 400 },
      );
    }
    if (body['visibility'] === 'PRIVATE' && body['notifyMembers'] === true) {
      return HttpResponse.json(
        { code: 'private_item.notification_invalid', message: 'Private items cannot notify other lobby members' },
        { status: 400 },
      );
    }
    const requesterId = String(getMockUserFromRequest(request)?.id ?? '');
    return HttpResponse.json(
      {
        ...body,
        id: 100,
        location: body['location'] ?? null,
        ownerId: requesterId ? Number(requesterId) : 1,
        createdAt: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),

  http.patch(`${BASE}/calendar/events/:id`, async ({ params, request }) => {
    const event = MOCK_EVENTS.find((e) => e.id === Number(params['id']));
    const requesterId = String(getMockUserFromRequest(request)?.id ?? '');
    if (!event) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    if (isUnauthorizedVisibilityChange(event, requesterId, body['visibility'])) {
      return new HttpResponse(null, { status: event.visibility === 'PRIVATE' ? 404 : 403 });
    }
    if (typeof body['location'] === 'string' && body['location'].trim() === '') {
      body['location'] = null;
    }
    return HttpResponse.json({ ...event, ...body });
  }),

  http.delete(`${BASE}/calendar/events/:id`, ({ params, request }) => {
    const event = MOCK_EVENTS.find((e) => e.id === Number(params['id']));
    const requesterId = String(getMockUserFromRequest(request)?.id ?? '');
    if (!event || isUnauthorizedVisibilityChange(event, requesterId)) {
      return new HttpResponse(null, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE}/calendar/conflicts`, async () => {
    await mockNetworkDelay();
    return HttpResponse.json([]);
  }),

  http.get(`${BASE}/calendar/user-conflict`, async () => {
    await mockNetworkDelay();
    return HttpResponse.json({
      userId: 1,
      hasConflict: false,
      conflictingEvent: null,
    });
  }),
];
