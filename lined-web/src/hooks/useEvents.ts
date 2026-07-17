import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listEvents, createEvent, deleteEvent } from '@/api/events';
import { QUERY_KEYS } from '@/lib/constants';
import { addDays } from '@/lib/calendarUtils';

export function useWeekEvents(weekStart: Date) {
  const from = weekStart.toISOString();
  const to = addDays(weekStart, 7).toISOString();

  return useQuery({
    queryKey: [...QUERY_KEYS.events, from],
    queryFn: () => listEvents({ from, to }),
  });
}

/** Week events scoped to one lobby. The backend has no per-lobby filter param, so filter client-side. */
export function useLobbyWeekEvents(lobbyId: number, weekStart: Date) {
  const from = weekStart.toISOString();
  const to = addDays(weekStart, 7).toISOString();

  return useQuery({
    queryKey: [...QUERY_KEYS.events, 'lobby', lobbyId, from],
    queryFn: () => listEvents({ from, to }),
    select: (events) => events.filter((e) => e.lobbyId === lobbyId),
  });
}

const UPCOMING_EVENTS_WINDOW_DAYS = 14;
const UPCOMING_EVENTS_LIMIT = 5;

/** Next 5 events across all lobbies over the coming 2 weeks, soonest first. */
export function useUpcomingEvents() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const from = startOfToday.toISOString();
  const to = addDays(startOfToday, UPCOMING_EVENTS_WINDOW_DAYS).toISOString();

  return useQuery({
    queryKey: [...QUERY_KEYS.events, 'upcoming', from.slice(0, 10)],
    queryFn: () => listEvents({ from, to }),
    select: (events) =>
      [...events]
        .sort((a, b) => a.startAt.localeCompare(b.startAt))
        .slice(0, UPCOMING_EVENTS_LIMIT),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteEvent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events });
    },
  });
}
