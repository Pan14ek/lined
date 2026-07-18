import { Link } from 'react-router-dom';
import type { EventDto } from '@/features/calendar/model';
import type { LobbyDto } from '@/features/lobby/model';
import { LOBBY_TYPE_BADGE_CLASSES, LOBBY_TYPE_COLORS } from '@/features/lobby/lib/constants';
import { formatRelativeEventTime } from '@/features/calendar/lib/calendarUtils';
import { EmptyState } from '@/components/EmptyState';

interface UpcomingEventsListProps {
  events: EventDto[] | undefined;
  lobbies: LobbyDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

export const UpcomingEventsList = ({
  events,
  lobbies,
  isLoading,
  isError,
}: UpcomingEventsListProps) => {
  const lobbyMap = new Map((lobbies ?? []).map((l) => [l.id, l]));

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Upcoming Events</h2>
        <Link to="/calendar" className="text-xs font-medium text-brand-green">
          View calendar →
        </Link>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2" data-testid="upcoming-events-loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-white" />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <p className="text-sm text-text-secondary">
          Couldn&apos;t load upcoming events. Try again later.
        </p>
      )}

      {!isLoading && !isError && events?.length === 0 && (
        <EmptyState
          icon="📅"
          message="No events yet — once you have a lobby, your shared calendar shows up here."
        />
      )}

      {!isLoading && !isError && events != null && events.length > 0 && (
        <div className="flex flex-col gap-2">
          {events.map((event) => {
            const lobby = lobbyMap.get(event.lobbyId);
            const lobbyType = lobby?.lobbyType ?? 'COUPLE';
            return (
              <div
                key={event.id}
                className="flex items-center gap-3 overflow-hidden rounded-lg bg-white p-3 shadow-[var(--shadow-sm)]"
              >
                <span className={`h-8 w-1 flex-shrink-0 rounded-full ${LOBBY_TYPE_COLORS[lobbyType]}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {event.title}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {formatRelativeEventTime(event.startAt)}
                  </p>
                </div>
                {lobby && (
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${LOBBY_TYPE_BADGE_CLASSES[lobbyType]}`}
                  >
                    {lobby.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
