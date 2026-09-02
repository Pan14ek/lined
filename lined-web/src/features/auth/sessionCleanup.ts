import type { QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { useCalendarStore } from '@/store/calendar';
import { useCreateMenuStore } from '@/store/createMenu';
import { useSettingsStore } from '@/store/settings';
import { invalidateAuthTransport } from '@/lib/apiClient';

/** Clears every volatile or cached value that could belong to the previous account. */
export const clearClientAuthentication = (queryClient: QueryClient): void => {
  invalidateAuthTransport();
  queryClient.clear();
  useCalendarStore.getState().resetUserState();
  useCreateMenuStore.getState().resetUserState();
  useSettingsStore.getState().resetUserState();
  useAuthStore.getState().clearAuthentication();
};
