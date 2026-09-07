import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { EventDto } from '@/features/calendar/model';
import type { LobbyDto } from '@/features/lobby/model';
import { LOBBY_TYPE_COLORS } from '@/features/lobby/lib/constants';
import { LobbyTypeBadge } from '@/features/lobby/LobbyTypeBadge';
import { formatRelativeEventTime } from '@/features/calendar/lib/calendarUtils';
import { EmptyState } from '@/components/patterns/EmptyState';
import { ErrorState } from '@/components/patterns/ErrorState';
import { SkeletonRow } from '@/components/skeletons/SkeletonRow';
import { useQueryStall } from '@/hooks/useQueryStall';
import { cn } from '@/lib/utils';

interface UpcomingEventsListProps {
  events: EventDto[] | undefined;
  lobbies: LobbyDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export const UpcomingEventsList = ({
  events,
  lobbies,
  isLoading,
  isError,
  onRetry,
}: UpcomingEventsListProps) => {
  const { t } = useTranslation('dashboard');
  const lobbyMap = new Map((lobbies ?? []).map((l) => [l.id, l]));
  const isStalled = useQueryStall(isLoading);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">{t('events.title')}</h2>
        <Link to="/calendar" className="text-xs font-medium text-brand-green">
          {t('events.viewCalendar')}
        </Link>
      </div>

      {isLoading && !isStalled && (
        <div className="flex flex-col gap-2" data-testid="upcoming-events-loading">
          {[0, 1, 2].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {(isStalled || (!isLoading && isError)) && (
        <ErrorState onRetry={onRetry} title={t('events.loadError')} />
      )}

      {!isLoading && !isError && events?.length === 0 && (
        <EmptyState icon="📅" title={t('events.empty')} />
      )}

      {!isLoading && !isError && events != null && events.length > 0 && (
        <div className="flex flex-col gap-2">
          {events.map((event) => {
            const lobby = lobbyMap.get(event.lobbyId);
            const lobbyType = lobby?.lobbyType ?? 'COUPLE';
            return (
              <div
                key={event.id}
                className="flex items-center gap-3 overflow-hidden rounded-lg bg-surface p-3 shadow-[var(--shadow-sm)]"
              >
                <span className={cn('h-8 w-1 flex-shrink-0 rounded-full', LOBBY_TYPE_COLORS[lobbyType])} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {event.title}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {formatRelativeEventTime(event.startAt)}
                  </p>
                </div>
                {lobby && (
                  <LobbyTypeBadge type={lobbyType} size="compact" className="flex-shrink-0">
                    {lobby.name}
                  </LobbyTypeBadge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
