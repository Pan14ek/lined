import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getErrorStatus } from '@/lib/apiClient';
import { listEvents, createEvent, updateEvent, deleteEvent, findConflicts } from '@/features/calendar/api';
import type { EventConflictDto, EventDto, EventUpdateDto } from '@/features/calendar/model';
import { QUERY_KEYS } from '@/features/calendar/lib/constants';
import { addDays, fromDatetimeLocal, getMonthGridDays } from '@/features/calendar/lib/calendarUtils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useNextFreeSlotHint } from '@/features/dashboard/hooks/useDashboard';

export const useRangeEvents = (from: Date, to: Date) => {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  return useQuery({
    queryKey: [...QUERY_KEYS.events, 'range', fromIso, toIso],
    queryFn: () => listEvents({ from: fromIso, to: toIso }),
  });
}

export const useWeekEvents = (weekStart: Date) => {
  return useRangeEvents(weekStart, addDays(weekStart, 7));
}

export const useMonthEvents = (monthAnchor: Date) => {
  const gridDays = getMonthGridDays(monthAnchor);
  const from = gridDays[0]!;
  const to = addDays(gridDays[gridDays.length - 1]!, 1);
  return useRangeEvents(from, to);
}

export const useLobbyWeekEvents = (lobbyId: number, weekStart: Date) => {
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

export const useUpcomingEvents = () => {
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

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events });
    },
  });
}

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: EventUpdateDto }) => updateEvent(id, data),
    onSuccess: (updated) => {
      // The PATCH response is already the authoritative updated event, so patch
      // every cached event list in place instead of refetching.
      queryClient.setQueriesData<EventDto[]>({ queryKey: QUERY_KEYS.events }, (old) =>
        old?.map((e) => (e.id === updated.id ? updated : e)),
      );
    },
    onError: (error, { id }) => {
      // A 404 means the event is gone/inaccessible — drop the stale row
      // instead of leaving it visible from a now-invalid cached list.
      if (getErrorStatus(error) !== 404) return;
      queryClient.setQueriesData<EventDto[]>({ queryKey: QUERY_KEYS.events }, (old) =>
        old?.filter((e) => e.id !== id),
      );
    },
  });
}

export const useEventConflicts = (params: { lobbyId: number | null; start: string | null; end: string | null; requesterId: number | null }, enabled: boolean) => {
  const { lobbyId, start, end, requesterId } = params;
  const queryEnabled = enabled && lobbyId != null && !!start && !!end && requesterId != null;

  return useQuery({
    queryKey: QUERY_KEYS.eventConflicts(lobbyId ?? 0, start ?? '', end ?? ''),
    queryFn: () => findConflicts({ lobbyId: lobbyId!, start: start!, end: end!, requesterId: requesterId! }),
    enabled: queryEnabled,
    retry: false,
  });
}

export interface ConflictCheckResult {
  conflicts: EventConflictDto[];
  suggestion: { start: string; end: string } | null;
}

export const useConflictCheck = (params: {
  lobbyId: number | null;
  startAt: string | null; // datetime-local value
  endAt: string | null; // datetime-local value
  currentUserId: number | null;
  excludeEventId?: number;
}): ConflictCheckResult => {
  const { lobbyId, startAt, endAt, currentUserId, excludeEventId } = params;
  const debouncedStartAt = useDebouncedValue(startAt);
  const debouncedEndAt = useDebouncedValue(endAt);

  let startIso: string | null = null;
  let endIso: string | null = null;
  if (debouncedStartAt && debouncedEndAt) {
    const start = fromDatetimeLocal(debouncedStartAt);
    const end = fromDatetimeLocal(debouncedEndAt);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start < end) {
      startIso = start.toISOString();
      endIso = end.toISOString();
    }
  }

  const conflictsQuery = useEventConflicts(
    { lobbyId, start: startIso, end: endIso, requesterId: currentUserId },
    startIso != null,
  );

  const conflicts = (conflictsQuery.data ?? []).filter(
    (c) => c.first.id !== excludeEventId && c.second.id !== excludeEventId,
  );
  const hasConflicts = conflicts.length > 0;

  const durationMs =
    startIso && endIso ? new Date(endIso).getTime() - new Date(startIso).getTime() : 0;
  const { slot } = useNextFreeSlotHint(lobbyId, startIso, durationMs, hasConflicts);

  const suggestion =
    slot != null
      ? { start: slot.start, end: new Date(new Date(slot.start).getTime() + durationMs).toISOString() }
      : null;

  return { conflicts, suggestion };
}

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteEvent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events });
    },
  });
}
