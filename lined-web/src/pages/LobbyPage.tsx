import { useParams, useSearchParams } from 'react-router-dom';
import { useLobby } from '@/hooks/useLobbies';
import { LobbyHeader } from '@/components/lobby/LobbyHeader';
import { LobbyTabBar, type LobbyTab } from '@/components/lobby/LobbyTabBar';
import { LobbyTaskList } from '@/components/lobby/LobbyTaskList';

const VALID_TABS: LobbyTab[] = ['calendar', 'tasks', 'members'];

const isLobbyTab = (value: string | null): value is LobbyTab =>
  VALID_TABS.includes(value as LobbyTab);

export function LobbyPage() {
  const { id } = useParams<{ id: string }>();
  const lobbyId = id ? Number(id) : undefined;
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: LobbyTab = isLobbyTab(tabParam) ? tabParam : 'tasks';

  const { data: lobby, isLoading, isError } = useLobby(lobbyId);

  const handleTabChange = (tab: LobbyTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="h-24 animate-pulse rounded-xl bg-white" data-testid="lobby-page-loading" />
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

  return (
    <div className="flex-1 overflow-y-auto">
      <LobbyHeader lobby={lobby} />
      <LobbyTabBar lobbyType={lobby.lobbyType} activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab === 'tasks' && <LobbyTaskList lobbyId={lobby.id} />}

      {activeTab === 'calendar' && (
        <p className="p-6 text-sm text-text-secondary">Lobby calendar coming soon...</p>
      )}

      {activeTab === 'members' && (
        <p className="p-6 text-sm text-text-secondary">Lobby members coming soon...</p>
      )}
    </div>
  );
}
