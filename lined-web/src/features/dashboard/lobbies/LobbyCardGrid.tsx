import { useTranslation } from 'react-i18next';
import type { EventDto } from '@/features/calendar/model';
import type { LobbyDto } from '@/features/lobby/model';
import type { TaskDto } from '@/features/tasks/model';
import { useCreateMenuStore } from '@/store/createMenu';
import { EmptyState } from '@/components/EmptyState';
import { LoadErrorState } from '@/components/LoadErrorState';
import { SkeletonCard } from '@/components/skeletons/SkeletonCard';
import { useQueryStall } from '@/hooks/useQueryStall';
import { LobbyCard } from './LobbyCard';

interface LobbyCardGridProps {
  lobbies: LobbyDto[] | undefined;
  upcomingEvents: EventDto[] | undefined;
  myTasks: TaskDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export const LobbyCardGrid = ({
  lobbies,
  upcomingEvents,
  myTasks,
  isLoading,
  isError,
  onRetry,
}: LobbyCardGridProps) => {
  const { t } = useTranslation('dashboard');
  const openCreateLobby = useCreateMenuStore((s) => s.openCreateLobby);
  const isStalled = useQueryStall(isLoading);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">{t('lobbies.title')}</h2>
        <span className="text-xs font-medium text-brand-green">{t('lobbies.seeAll')}</span>
      </div>

      {isLoading && !isStalled && (
        <div className="flex gap-4" data-testid="lobby-cards-loading">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="w-56 flex-shrink-0" />
          ))}
        </div>
      )}

      {(isStalled || (!isLoading && isError)) && (
        <LoadErrorState onRetry={onRetry} message={t('lobbies.loadError')} />
      )}

      {!isLoading && !isError && lobbies?.length === 0 && (
        <EmptyState
          variant="inline"
          message={t('lobbies.empty')}
          action={{ label: t('lobbies.createLobby'), onClick: () => openCreateLobby() }}
        />
      )}

      {!isLoading && !isError && lobbies != null && lobbies.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-1">
          {lobbies.map((lobby) => (
            <LobbyCard
              key={lobby.id}
              lobby={lobby}
              eventCount={
                upcomingEvents?.filter((e) => e.lobbyId === lobby.id).length ?? 0
              }
              taskCount={myTasks?.filter((t) => t.lobbyId === lobby.id).length ?? 0}
            />
          ))}
        </div>
      )}
    </section>
  );
}
