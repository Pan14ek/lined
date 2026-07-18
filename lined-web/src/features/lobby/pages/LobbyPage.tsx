import { useParams, useSearchParams } from 'react-router-dom';
import { useLobby } from '@/features/lobby/hooks/useLobbies';
import { LobbyHeader } from '@/features/lobby/header/LobbyHeader';
import { LobbyTabBar, type LobbyTab } from '@/features/lobby/header/LobbyTabBar';
import { LobbyTaskList } from '@/features/lobby/tasks/LobbyTaskList';
import { LobbyMemberList } from '@/features/lobby/members/LobbyMemberList';
import { LobbyCalendarView } from '@/features/lobby/calendar/LobbyCalendarView';
import { LobbyLoadingState, LobbyNotFoundState } from '@/features/lobby/header/LobbyLoadStates';

const VALID_TABS: LobbyTab[] = ['calendar', 'tasks', 'members'];

const isLobbyTab = (value: string | null): value is LobbyTab =>
  VALID_TABS.includes(value as LobbyTab);

export const LobbyPage = () => {
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
