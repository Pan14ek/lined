import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listEvents, createEvent, updateEvent, deleteEvent, findConflicts } from '@/api/events';
import type { EventConflictDto, EventDto, EventUpdateDto } from '@/types';
import { QUERY_KEYS } from '@/lib/constants';
import { addDays, fromDatetimeLocal, getMonthGridDays } from '@/lib/calendarUtils';
import { useDebouncedValue } from './useDebouncedValue';
import { useNextFreeSlotHint } from './useDashboard';

/** Generic date-range event query, keyed by the ISO range so distinct ranges cache separately. */
export function useRangeEvents(from: Date, to: Date) {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  return useQuery({
    queryKey: [...QUERY_KEYS.events, 'range', fromIso, toIso],
    queryFn: () => listEvents({ from: fromIso, to: toIso }),
  });
}

export function useWeekEvents(weekStart: Date) {
  return useRangeEvents(weekStart, addDays(weekStart, 7));
}

/** Events for the full 6-week grid a month view renders (may spill into adjacent months). */
export function useMonthEvents(monthAnchor: Date) {
  const gridDays = getMonthGridDays(monthAnchor);
  const from = gridDays[0]!;
  const to = addDays(gridDays[gridDays.length - 1]!, 1);
  return useRangeEvents(from, to);
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

export function useUpdateEvent() {
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
  });
}

/** Overlapping event pairs in a lobby's time window; disabled unless every param is present. */
export function useEventConflicts(
  params: { lobbyId: number | null; start: string | null; end: string | null; requesterId: number | null },
  enabled: boolean,
) {
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

/**
 * Debounced scheduling-conflict check for an event/reserve-slot form, plus a
 * same-duration "next free slot" suggestion once a conflict is found. Fails
 * open: loading or a failed check never blocks the form, they just resolve
 * to no conflicts.
 */
export function useConflictCheck(params: {
  lobbyId: number | null;
  startAt: string | null; // datetime-local value
  endAt: string | null; // datetime-local value
  currentUserId: number | null;
  excludeEventId?: number;
}): ConflictCheckResult {
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

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteEvent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events });
    },
  });
}
