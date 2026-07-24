import { http, HttpResponse } from 'msw';
import { mockNetworkDelay } from '@/lib/apiClient';
import { MOCK_NOTIFICATIONS } from './mockData';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

let mockPreferences = {
  sharedEventsEnabled: true,
  taskAssignedEnabled: true,
  freeSlotsEnabled: true,
  eventRemindersEnabled: true,
  emailDigestsEnabled: true,
};

const mockLobbyPreferences = new Map<number, Record<string, boolean | number>>();

const getLobbyPreferences = (lobbyId: number) => {
  return (
    mockLobbyPreferences.get(lobbyId) ?? {
      lobbyId,
      newEventsEnabled: true,
      taskUpdatesEnabled: true,
      freeSlotsEnabled: true,
    }
  );
}

export const notificationHandlers = [
  http.get(`${BASE}/notifications/preferences`, async () => {
    await mockNetworkDelay();
    return HttpResponse.json(mockPreferences);
  }),

  http.patch(`${BASE}/notifications/preferences`, async ({ request }) => {
    const body = (await request.json()) as Partial<typeof mockPreferences>;
    mockPreferences = { ...mockPreferences, ...body };
    return HttpResponse.json(mockPreferences);
  }),

  http.get(`${BASE}/lobbies/:lobbyId/notification-preferences`, async ({ params }) => {
    await mockNetworkDelay();
    const lobbyId = Number(params['lobbyId']);
    return HttpResponse.json(getLobbyPreferences(lobbyId));
  }),

  http.patch(`${BASE}/lobbies/:lobbyId/notification-preferences`, async ({ params, request }) => {
    const lobbyId = Number(params['lobbyId']);
    const body = (await request.json()) as Record<string, boolean>;
    const updated = { ...getLobbyPreferences(lobbyId), ...body, lobbyId };
    mockLobbyPreferences.set(lobbyId, updated);
    return HttpResponse.json(updated);
  }),

  http.get(`${BASE}/notifications/mine`, async () => {
    await mockNetworkDelay();
    return HttpResponse.json(MOCK_NOTIFICATIONS);
  }),

  http.patch(`${BASE}/notifications/:id/read`, ({ params }) => {
    const notification = MOCK_NOTIFICATIONS.find((n) => n.id === Number(params['id']));
    if (!notification) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ ...notification, readAt: new Date().toISOString() });
  }),
];
