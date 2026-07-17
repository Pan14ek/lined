import { useQuery } from '@tanstack/react-query';
import {
  getPreferences,
  updatePreferences,
  getLobbyPreferences,
  updateLobbyPreferences,
} from '@/api/notifications';
import { QUERY_KEYS } from '@/lib/constants';
import { useOptimisticPatchMutation } from './useOptimisticPatchMutation';
import type {
  NotificationPreferencesDto,
  NotificationPreferencesUpdateDto,
  LobbyNotificationPreferencesDto,
  LobbyNotificationPreferencesUpdateDto,
} from '@/types';

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
