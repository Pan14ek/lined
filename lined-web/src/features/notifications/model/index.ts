export type NotificationType = 'TASK_ASSIGNED' | 'SHARED_EVENT_CREATED';

export type NotificationMessageKey =
  | 'notificationMessages.taskAssigned'
  | 'notificationMessages.sharedEventCreated';

export type NotificationDeliveryChannel = 'IN_APP' | 'EMAIL' | 'PUSH';

export type NotificationDeliveryStatus = 'PENDING' | 'DELIVERED';

export interface NotificationPreferencesDto {
  sharedEventsEnabled: boolean;
  taskAssignedEnabled: boolean;
  freeSlotsEnabled: boolean;
  eventRemindersEnabled: boolean;
  emailDigestsEnabled: boolean;
}

export type NotificationPreferencesUpdateDto = Partial<NotificationPreferencesDto>;

export interface LobbyNotificationPreferencesDto {
  lobbyId: number;
  newEventsEnabled: boolean;
  taskUpdatesEnabled: boolean;
  freeSlotsEnabled: boolean;
}

export type LobbyNotificationPreferencesUpdateDto = Partial<
  Omit<LobbyNotificationPreferencesDto, 'lobbyId'>
>;

export interface NotificationDeliveryDto {
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  queuedAt: string;
  deliveredAt: string | null;
}

export interface NotificationDto {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  /** Localized message data supplied by the proposed backend contract. */
  messageKey?: NotificationMessageKey;
  messageParams?: Record<string, string | number>;
  lobbyId: number | null;
  taskId: number | null;
  eventId: number | null;
  readAt: string | null;
  createdAt: string;
  deliveries: NotificationDeliveryDto[];
}
