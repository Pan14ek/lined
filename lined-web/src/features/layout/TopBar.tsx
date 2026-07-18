import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useUiStore } from '@/store/ui';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/calendar': 'Calendar',
  '/tasks': 'Tasks',
  '/settings': 'Settings',
};

export const TopBar = () => {
  const location = useLocation();
  const openSidebarDrawer = useUiStore((s) => s.openSidebarDrawer);

  const title =
    ROUTE_TITLES[location.pathname] ??
    (location.pathname.startsWith('/lobbies/') ? 'Lobby' : 'Lined');

  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:h-16 md:px-6">
      <button
        type="button"
        onClick={openSidebarDrawer}
        aria-label="Open menu"
        className="-ml-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-bg lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="truncate text-base font-semibold text-text-primary md:text-lg">{title}</h1>
    </header>
  );
}
