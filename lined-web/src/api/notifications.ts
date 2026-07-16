import { api } from './client';
import type {
  NotificationPreferencesDto,
  NotificationPreferencesUpdateDto,
  LobbyNotificationPreferencesDto,
  LobbyNotificationPreferencesUpdateDto,
  NotificationDto,
} from '@/types';

export function getPreferences(): Promise<NotificationPreferencesDto> {
  return api.get('notifications/preferences').json<NotificationPreferencesDto>();
}

export function updatePreferences(
  data: NotificationPreferencesUpdateDto,
): Promise<NotificationPreferencesDto> {
  return api
    .patch('notifications/preferences', { json: data })
    .json<NotificationPreferencesDto>();
}

export function getLobbyPreferences(
  lobbyId: number,
): Promise<LobbyNotificationPreferencesDto> {
  return api
    .get(`lobbies/${lobbyId}/notification-preferences`)
    .json<LobbyNotificationPreferencesDto>();
}

export function updateLobbyPreferences(
  lobbyId: number,
  data: LobbyNotificationPreferencesUpdateDto,
): Promise<LobbyNotificationPreferencesDto> {
  return api
    .patch(`lobbies/${lobbyId}/notification-preferences`, { json: data })
    .json<LobbyNotificationPreferencesDto>();
}

export function myNotifications(): Promise<NotificationDto[]> {
  return api.get('notifications/mine').json<NotificationDto[]>();
}

export function markRead(id: number): Promise<NotificationDto> {
  return api.patch(`notifications/${id}/read`).json<NotificationDto>();
}
