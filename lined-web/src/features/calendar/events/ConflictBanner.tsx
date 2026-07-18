import { TriangleAlert } from 'lucide-react';
import type { EventConflictDto } from '@/features/calendar/model';
import { useUsers } from '@/features/users/hooks/useUsers';
import { formatEventTime, formatFreeSlotRange } from '@/features/calendar/lib/calendarUtils';

interface ConflictBannerProps {
  conflicts: EventConflictDto[];
  currentUserId: number | null;
  suggestion: { start: string; end: string } | null;
  onPickSuggestion: (start: string, end: string) => void;
}

const otherEvent = (conflict: EventConflictDto, currentUserId: number | null) => {
  if (conflict.first.ownerId !== currentUserId && conflict.second.ownerId === currentUserId) {
    return conflict.first;
  }
  if (conflict.second.ownerId !== currentUserId && conflict.first.ownerId === currentUserId) {
    return conflict.second;
  }
  return conflict.first;
}

export const ConflictBanner = ({
  conflicts,
  currentUserId,
  suggestion,
  onPickSuggestion,
}: ConflictBannerProps) => {
  const busyEvents = conflicts.map((c) => otherEvent(c, currentUserId));
  const ownerIds = [...new Set(busyEvents.map((e) => e.ownerId))];
  const ownerQueries = useUsers(ownerIds);
  const usernameByOwnerId = new Map<number, string>();
  ownerQueries.forEach((q, i) => {
    if (q.data?.username) usernameByOwnerId.set(ownerIds[i]!, q.data.username);
  });

  if (conflicts.length === 0) return null;

  return (
    <div
      role="status"
      className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-3 dark:border-amber-800/60 dark:bg-amber-950/30"
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700 dark:text-amber-400" />
      <div className="text-xs text-amber-700 dark:text-amber-400">
        <div className="text-[13px] font-bold">
          Scheduling conflict for {ownerIds.length} member{ownerIds.length === 1 ? '' : 's'}
        </div>
        <div className="mt-0.5 space-y-0.5 leading-relaxed opacity-90">
          {busyEvents.map((event) => (
            <div key={event.id}>
              <strong>{usernameByOwnerId.get(event.ownerId) ?? 'A lobby member'}</strong> already
              has <strong>&ldquo;{event.title}&rdquo;</strong> {formatEventTime(event.startAt, event.endAt)}.
              You are free at this time.
            </div>
          ))}
        </div>
        {suggestion && (
          <button
            type="button"
            onClick={() => onPickSuggestion(suggestion.start, suggestion.end)}
            className="mt-1.5 block font-semibold underline-offset-2 hover:underline"
          >
            Next slot when everyone is free: {formatFreeSlotRange(suggestion.start, suggestion.end)} →
          </button>
        )}
      </div>
    </div>
  );
}
