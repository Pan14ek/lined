import type { EventDto, LobbyDto, TaskDto } from '@/types';
import { useCreateMenuStore } from '@/store/createMenu';
import { EmptyState } from '@/components/EmptyState';
import { LobbyCard } from './LobbyCard';

interface LobbyCardGridProps {
  lobbies: LobbyDto[] | undefined;
  upcomingEvents: EventDto[] | undefined;
  myTasks: TaskDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function LobbyCardGrid({
  lobbies,
  upcomingEvents,
  myTasks,
  isLoading,
  isError,
}: LobbyCardGridProps) {
  const openCreateLobby = useCreateMenuStore((s) => s.openCreateLobby);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">My Lobbies</h2>
        <span className="text-xs font-medium text-brand-green">See all →</span>
      </div>

      {isLoading && (
        <div className="flex gap-4" data-testid="lobby-cards-loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 w-56 flex-shrink-0 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <p className="text-sm text-text-secondary">
          Couldn&apos;t load your lobbies. Try again later.
        </p>
      )}

      {!isLoading && !isError && lobbies?.length === 0 && (
        <EmptyState
          variant="inline"
          message="No lobbies yet"
          action={{ label: '+ Create lobby', onClick: () => openCreateLobby() }}
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
