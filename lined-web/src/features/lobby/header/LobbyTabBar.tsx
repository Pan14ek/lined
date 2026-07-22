import { useTranslation } from 'react-i18next';
import type { LobbyType } from '@/features/lobby/model';
import { LOBBY_TYPE_BORDER_CLASSES } from '@/features/lobby/lib/constants';
import { cn } from '@/lib/utils';

export type LobbyTab = 'calendar' | 'tasks' | 'members';

const TABS = [
  { id: 'calendar', labelKey: 'tabs.calendar', emoji: '📅' },
  { id: 'tasks', labelKey: 'tabs.tasks', emoji: '✅' },
  { id: 'members', labelKey: 'tabs.members', emoji: '👥' },
] as const satisfies { id: LobbyTab; labelKey: string; emoji: string }[];

interface LobbyTabBarProps {
  lobbyType: LobbyType;
  activeTab: LobbyTab;
  onTabChange: (tab: LobbyTab) => void;
}

export const LobbyTabBar = ({ lobbyType, activeTab, onTabChange }: LobbyTabBarProps) => {
  const { t } = useTranslation('lobby');
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
            className={cn(
              'border-b-2 px-1 py-3 text-sm font-medium transition-colors',
              isActive
                ? [LOBBY_TYPE_BORDER_CLASSES[lobbyType], 'text-text-primary']
                : 'border-transparent text-text-secondary hover:text-text-primary',
            )}
          >
            {tab.emoji} {t(tab.labelKey)}
          </button>
        );
      })}
    </div>
  );
};
