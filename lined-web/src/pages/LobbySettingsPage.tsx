import { Link, useParams } from 'react-router-dom';
import { useLobby } from '@/hooks/useLobbies';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LobbyHeader } from '@/components/lobby/LobbyHeader';
import { LobbyGeneralCard } from '@/components/lobby/LobbyGeneralCard';
import { LobbyNotificationsCard } from '@/components/lobby/LobbyNotificationsCard';
import { LobbyDangerZoneCard } from '@/components/lobby/LobbyDangerZoneCard';

export function LobbySettingsPage() {
  const { id } = useParams<{ id: string }>();
  const lobbyId = id ? Number(id) : undefined;

  const { data: lobby, isLoading, isError } = useLobby(lobbyId);
  const { data: currentUser } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div
          className="h-24 animate-pulse rounded-xl bg-white"
          data-testid="lobby-settings-page-loading"
        />
        <div className="mt-4 h-10 w-64 animate-pulse rounded-lg bg-white" />
      </div>
    );
  }

  if (isError || !lobby) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <p className="text-sm text-text-secondary">
          Lobby not found. It may have been deleted, or you may not have access to it.
        </p>
      </div>
    );
  }

  const isOwner = currentUser != null && currentUser.id === lobby.ownerId;

  return (
    <div className="flex-1 overflow-y-auto">
      <LobbyHeader lobby={lobby} />

      <div className="p-8">
        <div className="mb-6 flex items-center gap-2 text-sm text-text-secondary">
          <Link to={`/lobbies/${lobby.id}`} className="text-brand-green hover:underline">
            ← Back to lobby
          </Link>
          <span>·</span>
          <span className="font-semibold text-text-primary">Lobby Settings</span>
        </div>

        <LobbyGeneralCard lobby={lobby} isOwner={isOwner} />
        <LobbyNotificationsCard lobbyId={lobby.id} />
        <LobbyDangerZoneCard lobby={lobby} currentUserId={currentUser?.id} />
      </div>
    </div>
  );
}
