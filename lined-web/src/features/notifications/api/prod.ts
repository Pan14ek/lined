import { api } from '@/lib/apiClient';
import type { NotificationPreferencesDto, NotificationPreferencesUpdateDto, LobbyNotificationPreferencesDto, LobbyNotificationPreferencesUpdateDto, NotificationDto } from '@/features/notifications/model';

export const getPreferences = (): Promise<NotificationPreferencesDto> => {
  return api.get('notifications/preferences').json<NotificationPreferencesDto>();
}

export const updatePreferences = (data: NotificationPreferencesUpdateDto): Promise<NotificationPreferencesDto> => {
  return api
    .patch('notifications/preferences', { json: data })
    .json<NotificationPreferencesDto>();
}

export const getLobbyPreferences = (lobbyId: number): Promise<LobbyNotificationPreferencesDto> => {
  return api
    .get(`lobbies/${lobbyId}/notification-preferences`)
    .json<LobbyNotificationPreferencesDto>();
}

export const updateLobbyPreferences = (lobbyId: number, data: LobbyNotificationPreferencesUpdateDto): Promise<LobbyNotificationPreferencesDto> => {
  return api
    .patch(`lobbies/${lobbyId}/notification-preferences`, { json: data })
    .json<LobbyNotificationPreferencesDto>();
}

export const myNotifications = (): Promise<NotificationDto[]> => {
  return api.get('notifications/mine').json<NotificationDto[]>();
}

export const markRead = (id: number): Promise<NotificationDto> => {
  return api.patch(`notifications/${id}/read`).json<NotificationDto>();
}
