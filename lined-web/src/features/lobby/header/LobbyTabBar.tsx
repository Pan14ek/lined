import type { LobbyType } from '@/features/lobby/model';
import { LOBBY_TYPE_BORDER_CLASSES } from '@/features/lobby/lib/constants';

export type LobbyTab = 'calendar' | 'tasks' | 'members';

const TABS: { id: LobbyTab; label: string; emoji: string }[] = [
  { id: 'calendar', label: 'Calendar', emoji: '📅' },
  { id: 'tasks', label: 'Tasks', emoji: '✅' },
  { id: 'members', label: 'Members', emoji: '👥' },
];

interface LobbyTabBarProps {
  lobbyType: LobbyType;
  activeTab: LobbyTab;
  onTabChange: (tab: LobbyTab) => void;
}

export const LobbyTabBar = ({ lobbyType, activeTab, onTabChange }: LobbyTabBarProps) => {
  return (
    <div role="tablist" className="flex gap-6 overflow-x-auto border-b border-border bg-surface px-4 md:px-6">
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              isActive
                ? `${LOBBY_TYPE_BORDER_CLASSES[lobbyType]} text-text-primary`
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        );
      })}
    </div>
  );
};
