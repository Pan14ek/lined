export const QUERY_KEYS = {
  notificationPreferences: ['notifications', 'preferences'] as const,
  lobbyNotificationPreferences: (lobbyId: number) =>
    ['notifications', 'lobby-preferences', lobbyId] as const,
  myNotifications: ['notifications', 'mine'] as const,
} as const;
