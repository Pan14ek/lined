import { http, HttpResponse } from 'msw';
import { MOCK_EVENTS } from './mockData';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export const eventHandlers = [
  http.get(`${BASE}/calendar/events`, ({ request }) => {
    const url = new URL(request.url);
    let events = [...MOCK_EVENTS];

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
    return HttpResponse.json(
      {
        id: 100,
        location: null,
        ownerId: 1,
        createdAt: new Date().toISOString(),
        ...body,
      },
      { status: 201 },
    );
  }),

  http.patch(`${BASE}/calendar/events/:id`, async ({ params, request }) => {
    const event = MOCK_EVENTS.find((e) => e.id === Number(params['id']));
    if (!event) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body['location'] === 'string' && body['location'].trim() === '') {
      body['location'] = null;
    }
    return HttpResponse.json({ ...event, ...body });
  }),

  http.delete(`${BASE}/calendar/events/:id`, ({ params }) => {
    const exists = MOCK_EVENTS.some((e) => e.id === Number(params['id']));
    if (!exists) return new HttpResponse(null, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE}/calendar/conflicts`, () => {
    return HttpResponse.json([]);
  }),

  http.get(`${BASE}/calendar/user-conflict`, () => {
    return HttpResponse.json({
      userId: 1,
      hasConflict: false,
      conflictingEvent: null,
    });
  }),
];
