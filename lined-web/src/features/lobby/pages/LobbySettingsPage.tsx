import { Link, useParams } from 'react-router-dom';
import { useLobby } from '@/features/lobby/hooks/useLobbies';
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser';
import { LobbyHeader } from '@/features/lobby/header/LobbyHeader';
import { LobbyGeneralCard } from '@/features/lobby/settings/LobbyGeneralCard';
import { LobbyNotificationsCard } from '@/features/lobby/settings/LobbyNotificationsCard';
import { LobbyDangerZoneCard } from '@/features/lobby/settings/LobbyDangerZoneCard';
import { LobbyLoadingState, LobbyNotFoundState } from '@/features/lobby/header/LobbyLoadStates';

export const LobbySettingsPage = () => {
  const { id } = useParams<{ id: string }>();
  const lobbyId = id ? Number(id) : undefined;

  const { data: lobby, isLoading, isError } = useLobby(lobbyId);
  const { data: currentUser } = useCurrentUser();

  if (isLoading) {
    return <LobbyLoadingState loadingTestId="lobby-settings-page-loading" />;
  }

  if (isError || !lobby) {
    return <LobbyNotFoundState />;
  }

  const isOwner = currentUser != null && currentUser.id === lobby.ownerId;

  return (
    <div className="flex-1 overflow-y-auto">
      <LobbyHeader lobby={lobby} />

      <div className="p-4 md:p-8">
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
