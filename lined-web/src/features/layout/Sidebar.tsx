import { NavLink, useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from '@/features/users/UserAvatar';
import { Separator } from '@/components/design-system/data-display/Separator';
import { SkeletonRow } from '@/components/skeletons/SkeletonRow';
import { SkeletonAvatar } from '@/components/skeletons/SkeletonAvatar';
import { useMyLobbies } from '@/features/lobby/hooks/useLobbies';
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser';
import { useQueryClient } from '@tanstack/react-query';
import { logoutSession } from '@/lib/apiClient';
import { clearClientAuthentication } from '@/features/auth/sessionCleanup';
import { useCreateMenuStore } from '@/store/createMenu';
import { LOBBY_TYPE_COLORS } from '@/features/lobby/lib/constants';
import { EmptyState } from '@/components/patterns/EmptyState';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './navItems';

interface SidebarProps {
  /** Called after any nav link is clicked — used by the mobile drawer to close itself. */
  onNavigate?: () => void;
}

export const Sidebar = ({ onNavigate }: SidebarProps = {}) => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { data: lobbies, isLoading: lobbiesLoading } = useMyLobbies();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const openCreateLobby = useCreateMenuStore((s) => s.openCreateLobby);
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    try {
      await logoutSession();
    } finally {
      clearClientAuthentication(queryClient);
      navigate('/sign-in');
    }
  };

  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col bg-brand-sidebar text-white">
      {/* Logo */}
      <div className="flex h-16 items-center px-5">
        <span className="text-xl font-bold tracking-tight">{t('nav.appName')}</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-green text-white'
                  : 'text-text-light hover:bg-brand-sidebar-hover'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      <Separator className="mx-3 my-4 bg-brand-sidebar-hover" />

      {/* Lobbies */}
      <div className="flex flex-col gap-1 px-3">
        <div className="flex items-center justify-between px-3">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            {t('sidebar.myLobbies')}
          </span>
          <button
            type="button"
            onClick={() => openCreateLobby()}
            className="text-xs font-medium text-brand-green hover:underline"
          >
            {t('sidebar.newLobby')}
          </button>
        </div>

        {lobbiesLoading && (
          <div className="flex flex-col gap-1 px-3 py-1" data-testid="lobbies-loading">
            {[0, 1, 2].map((i) => (
              <SkeletonRow key={i} className="h-8 bg-brand-sidebar-hover" />
            ))}
          </div>
        )}

        {!lobbiesLoading && lobbies?.length === 0 && (
          <div className="px-3 py-2">
            <EmptyState
              variant="inline"
              title={t('sidebar.noLobbiesYet')}
              action={{ label: t('sidebar.newLobby'), onClick: () => openCreateLobby() }}
              className="text-muted-foreground"
            />
          </div>
        )}

        {!lobbiesLoading &&
          lobbies?.map((lobby) => (
            <NavLink
              key={lobby.id}
              to={`/lobbies/${lobby.id}`}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-green text-white'
                    : 'text-text-light hover:bg-brand-sidebar-hover'
                }`
              }
            >
              <span
                className={cn('h-2.5 w-2.5 rounded-full', LOBBY_TYPE_COLORS[lobby.lobbyType])}
              />
              {lobby.name}
            </NavLink>
          ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <div className="px-3 pb-2">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-green text-white'
                : 'text-text-light hover:bg-brand-sidebar-hover'
            }`
          }
        >
          <Settings className="h-5 w-5" />
          {t('nav.settings')}
        </NavLink>
      </div>

      <Separator className="mx-3 bg-brand-sidebar-hover" />

      {/* User Footer */}
      {userLoading && (
        <SkeletonAvatar
          className="px-5 py-4"
          boneClassName="bg-brand-sidebar-hover"
          testId="user-loading"
        />
      )}

      {!userLoading && user && (
        <div className="flex items-center gap-3 px-5 py-4">
          <UserAvatar user={user} className="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.username}</p>
            <p className="truncate text-xs text-text-muted">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label={t('sidebar.signOut')}
            className="flex-shrink-0 text-text-muted hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
