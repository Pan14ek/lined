import { useParams, useSearchParams } from 'react-router-dom';
import { useLobby } from '@/hooks/useLobbies';
import { LobbyHeader } from '@/components/lobby/LobbyHeader';
import { LobbyTabBar, type LobbyTab } from '@/components/lobby/LobbyTabBar';
import { LobbyTaskList } from '@/components/lobby/LobbyTaskList';
import { LobbyMemberList } from '@/components/lobby/LobbyMemberList';
import { LobbyCalendarView } from '@/components/lobby/LobbyCalendarView';
import { LobbyLoadingState, LobbyNotFoundState } from '@/components/lobby/LobbyLoadStates';

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
    return <LobbyLoadingState loadingTestId="lobby-page-loading" />;
  }

  if (isError || !lobby) {
    return <LobbyNotFoundState />;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <LobbyHeader lobby={lobby} />
      <LobbyTabBar lobbyType={lobby.lobbyType} activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab === 'tasks' && <LobbyTaskList lobbyId={lobby.id} />}

      {activeTab === 'calendar' && <LobbyCalendarView lobby={lobby} />}

      {activeTab === 'members' && <LobbyMemberList lobby={lobby} />}
    </div>
  );
}
