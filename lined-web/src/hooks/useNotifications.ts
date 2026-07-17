import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPreferences, updatePreferences } from '@/api/notifications';
import { QUERY_KEYS } from '@/lib/constants';
import type { NotificationPreferencesDto, NotificationPreferencesUpdateDto } from '@/types';

export const useNotificationPreferences = () =>
  useQuery({
    queryKey: QUERY_KEYS.notificationPreferences,
    queryFn: getPreferences,
  });

interface UpdatePreferencesContext {
  previous: NotificationPreferencesDto | undefined;
}

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation<
    NotificationPreferencesDto,
    unknown,
    NotificationPreferencesUpdateDto,
    UpdatePreferencesContext
  >({
    mutationFn: updatePreferences,
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.notificationPreferences });
      const previous = queryClient.getQueryData<NotificationPreferencesDto>(
        QUERY_KEYS.notificationPreferences,
      );
      if (previous) {
        queryClient.setQueryData<NotificationPreferencesDto>(
          QUERY_KEYS.notificationPreferences,
          { ...previous, ...patch },
        );
      }
      return { previous };
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<NotificationPreferencesDto>(
        QUERY_KEYS.notificationPreferences,
        updated,
      );
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.notificationPreferences, context.previous);
      }
    },
  });
};
