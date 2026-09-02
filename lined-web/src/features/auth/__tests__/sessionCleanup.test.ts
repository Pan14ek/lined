import { describe, expect, it, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { clearClientAuthentication } from '../sessionCleanup';
import { useAuthStore } from '@/store/auth';
import { useCalendarStore } from '@/store/calendar';
import { useCreateMenuStore } from '@/store/createMenu';
import { useSettingsStore } from '@/store/settings';

describe('clearClientAuthentication', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'mock-token-1', status: 'authenticated' });
    useCalendarStore.setState({ selectedEventId: 42, isCreateModalOpen: true, hiddenLobbyIds: [7] });
    useCreateMenuStore.setState({ overlay: 'task', isCreateLobbyOpen: true });
    useSettingsStore.setState({ locale: 'uk' });
  });

  it('clears query data and all user-scoped client state', () => {
    expect.assertions(7);
    const queryClient = new QueryClient();
    queryClient.setQueryData(['users', 'me'], { id: 1 });
    queryClient.setQueryData(['calendar', 'events'], [{ id: 1 }]);

    clearClientAuthentication(queryClient);

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(useAuthStore.getState()).toMatchObject({ accessToken: null, status: 'unauthenticated' });
    expect(useCalendarStore.getState()).toMatchObject({
      selectedEventId: null,
      isCreateModalOpen: false,
      hiddenLobbyIds: [],
    });
    expect(useCreateMenuStore.getState()).toMatchObject({
      overlay: null,
      isCreateLobbyOpen: false,
    });
    expect(useSettingsStore.getState().locale).toBe('en');
    expect(localStorage.getItem('lined-auth')).toBeNull();
    expect(sessionStorage.getItem('lined-auth')).toBeNull();
  });
});
