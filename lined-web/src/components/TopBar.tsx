import { useLocation } from 'react-router-dom';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/calendar': 'Calendar',
  '/tasks': 'Tasks',
  '/settings': 'Settings',
};

export function TopBar() {
  const location = useLocation();

  const title =
    ROUTE_TITLES[location.pathname] ??
    (location.pathname.startsWith('/lobbies/') ? 'Lobby' : 'Lined');

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-white px-6">
      <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
    </header>
  );
}
