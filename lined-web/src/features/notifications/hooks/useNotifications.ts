import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorStatus } from '@/lib/apiClient';
import {
  getPreferences,
  updatePreferences,
  getLobbyPreferences,
  updateLobbyPreferences,
  myNotifications,
  markRead,
} from '@/features/notifications/api';
import { QUERY_KEYS } from '@/features/notifications/lib/constants';
import { useOptimisticPatchMutation } from '@/hooks/useOptimisticPatchMutation';
import type { NotificationPreferencesDto, NotificationPreferencesUpdateDto, LobbyNotificationPreferencesDto, LobbyNotificationPreferencesUpdateDto, NotificationDto } from '@/features/notifications/model';

const NOTIFICATIONS_POLL_INTERVAL_MS = 60_000;

export const useNotificationPreferences = () =>
  useQuery({
    queryKey: QUERY_KEYS.notificationPreferences,
    queryFn: getPreferences,
  });

export const useUpdateNotificationPreferences = () =>
  useOptimisticPatchMutation<NotificationPreferencesDto, NotificationPreferencesUpdateDto>({
    queryKey: QUERY_KEYS.notificationPreferences,
    mutationFn: updatePreferences,
  });

export const useLobbyNotificationPreferences = (lobbyId: number) =>
  useQuery({
    queryKey: QUERY_KEYS.lobbyNotificationPreferences(lobbyId),
    queryFn: () => getLobbyPreferences(lobbyId),
  });

export const useUpdateLobbyNotificationPreferences = (lobbyId: number) =>
  useOptimisticPatchMutation<
    LobbyNotificationPreferencesDto,
    LobbyNotificationPreferencesUpdateDto
  >({
    queryKey: QUERY_KEYS.lobbyNotificationPreferences(lobbyId),
    mutationFn: (data) => updateLobbyPreferences(lobbyId, data),
  });

export const useMyNotifications = () =>
  useQuery({
    queryKey: QUERY_KEYS.myNotifications,
    queryFn: myNotifications,
    refetchInterval: NOTIFICATIONS_POLL_INTERVAL_MS,
  });

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markRead(id),
    onSuccess: (updated) => {
      queryClient.setQueryData<NotificationDto[]>(QUERY_KEYS.myNotifications, (current) =>
        current?.map((n) => (n.id === updated.id ? updated : n)),
      );
    },
    onError: (error, id) => {
      // A 404 means the notification is gone/no longer this caller's —
      // drop the stale row instead of continuing to show its content.
      if (getErrorStatus(error) !== 404) return;
      queryClient.setQueryData<NotificationDto[]>(QUERY_KEYS.myNotifications, (current) =>
        current?.filter((n) => n.id !== id),
      );
    },
  });
};
