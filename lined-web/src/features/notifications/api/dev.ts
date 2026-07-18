import { MockHttpError, mockDelay } from '@/lib/apiClient';
import { MOCK_NOTIFICATIONS } from './mockData';
import type {
  NotificationPreferencesDto,
  NotificationPreferencesUpdateDto,
  LobbyNotificationPreferencesDto,
  LobbyNotificationPreferencesUpdateDto,
  NotificationDto,
} from '@/features/notifications/model';

const notifications: NotificationDto[] = MOCK_NOTIFICATIONS.map((n) => ({ ...n }));

let preferences: NotificationPreferencesDto = {
  sharedEventsEnabled: true,
  taskAssignedEnabled: true,
  freeSlotsEnabled: true,
  eventRemindersEnabled: true,
  emailDigestsEnabled: true,
};

const lobbyPreferences = new Map<number, LobbyNotificationPreferencesDto>();

const getOrInitLobbyPreferences = (lobbyId: number): LobbyNotificationPreferencesDto => {
  return (
    lobbyPreferences.get(lobbyId) ?? {
      lobbyId,
      newEventsEnabled: true,
      taskUpdatesEnabled: true,
      freeSlotsEnabled: true,
    }
  );
}

export const getPreferences = async (): Promise<NotificationPreferencesDto> => {
  await mockDelay();
  return preferences;
}

export const updatePreferences = async (data: NotificationPreferencesUpdateDto): Promise<NotificationPreferencesDto> => {
  await mockDelay();
  preferences = { ...preferences, ...data };
  return preferences;
}

export const getLobbyPreferences = async (lobbyId: number): Promise<LobbyNotificationPreferencesDto> => {
  await mockDelay();
  return getOrInitLobbyPreferences(lobbyId);
}

export const updateLobbyPreferences = async (lobbyId: number, data: LobbyNotificationPreferencesUpdateDto): Promise<LobbyNotificationPreferencesDto> => {
  await mockDelay();
  const updated = { ...getOrInitLobbyPreferences(lobbyId), ...data, lobbyId };
  lobbyPreferences.set(lobbyId, updated);
  return updated;
}

export const myNotifications = async (): Promise<NotificationDto[]> => {
  await mockDelay();
  return notifications;
}

export const markRead = async (id: number): Promise<NotificationDto> => {
  await mockDelay();
  const notification = notifications.find((n) => n.id === id);
  if (!notification) throw new MockHttpError(404, 'Notification not found');
  notification.readAt = new Date().toISOString();
  return notification;
}
