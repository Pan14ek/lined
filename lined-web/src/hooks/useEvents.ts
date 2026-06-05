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
