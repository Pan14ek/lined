import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '@/store/ui';

const ROUTE_TITLE_KEYS = {
  '/': 'nav.dashboard',
  '/calendar': 'nav.calendar',
  '/tasks': 'nav.tasks',
  '/settings': 'nav.settings',
} as const;

export const TopBar = () => {
  const { t } = useTranslation('common');
  const location = useLocation();
  const openSidebarDrawer = useUiStore((s) => s.openSidebarDrawer);

  const routeTitleKey = Object.hasOwn(ROUTE_TITLE_KEYS, location.pathname)
    ? ROUTE_TITLE_KEYS[location.pathname as keyof typeof ROUTE_TITLE_KEYS]
    : undefined;
  const titleKey: (typeof ROUTE_TITLE_KEYS)[keyof typeof ROUTE_TITLE_KEYS] | 'nav.lobby' | 'nav.appName' =
    routeTitleKey ??
    (location.pathname.startsWith('/lobbies/') ? 'nav.lobby' : 'nav.appName');

  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:h-16 md:px-6">
      <button
        type="button"
        onClick={openSidebarDrawer}
        aria-label={t('topBar.openMenu')}
        className="-ml-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-bg lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="truncate text-base font-semibold text-text-primary md:text-lg">{t(titleKey)}</h1>
    </header>
  );
}
