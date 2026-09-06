import type { QueryClient } from '@tanstack/react-query';
import { QUERY_KEYS as LOBBY_QUERY_KEYS } from '@/features/lobby/lib/constants';
import { QUERY_KEYS as TASKS_QUERY_KEYS } from '@/features/tasks/lib/constants';
import { QUERY_KEYS as CALENDAR_QUERY_KEYS } from '@/features/calendar/lib/constants';
import { QUERY_KEYS as NOTIFICATIONS_QUERY_KEYS } from '@/features/notifications/lib/constants';

/**
 * Removes every cached query scoped to a lobby the current user no longer has
 * access to — used after a hidden `404` on the lobby detail fetch, a
 * successful self-leave, or a successful lobby deletion, so stale protected
 * data cannot keep rendering from cache once access is gone.
 */
export const removeLobbyScopedQueries = (queryClient: QueryClient, lobbyId: number): void => {
  queryClient.removeQueries({ queryKey: LOBBY_QUERY_KEYS.lobbyDetail(lobbyId), exact: true });
  queryClient.removeQueries({ queryKey: LOBBY_QUERY_KEYS.lobbyFreeSlots(lobbyId), exact: true });
  queryClient.removeQueries({ queryKey: LOBBY_QUERY_KEYS.lobbyInvites(lobbyId), exact: true });
  queryClient.removeQueries({ queryKey: TASKS_QUERY_KEYS.lobbyTasks(lobbyId), exact: true });
  queryClient.removeQueries({ queryKey: TASKS_QUERY_KEYS.myTasks, exact: true });
  queryClient.removeQueries({
    queryKey: NOTIFICATIONS_QUERY_KEYS.lobbyNotificationPreferences(lobbyId),
    exact: true,
  });
  // Calendar event/conflict lists mix rows from every lobby together, so a
  // single lobby's rows can't be excised in place — purge every cached
  // calendar query and let it refetch without the now-inaccessible lobby.
  queryClient.removeQueries({ queryKey: CALENDAR_QUERY_KEYS.events });
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] === 'calendar' && query.queryKey[1] === 'conflicts',
  });
};
