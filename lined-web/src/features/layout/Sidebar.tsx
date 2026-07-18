import { NavLink, useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useMyLobbies } from '@/features/lobby/hooks/useLobbies';
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser';
import { useAuthStore } from '@/store/auth';
import { useCreateMenuStore } from '@/store/createMenu';
import { LOBBY_TYPE_COLORS } from '@/features/lobby/lib/constants';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './navItems';

interface SidebarProps {
  /** Called after any nav link is clicked — used by the mobile drawer to close itself. */
  onNavigate?: () => void;
}

export const Sidebar = ({ onNavigate }: SidebarProps = {}) => {
  const navigate = useNavigate();
  const { data: lobbies, isLoading: lobbiesLoading } = useMyLobbies();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const openCreateLobby = useCreateMenuStore((s) => s.openCreateLobby);
  const setUserId = useAuthStore((s) => s.setUserId);

  const handleSignOut = () => {
        setUserId(null);
        navigate('/sign-in');
      }

  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col bg-brand-sidebar text-white">
      {/* Logo */}
      <div className="flex h-16 items-center px-5">
        <span className="text-xl font-bold tracking-tight">Lined</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
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
            {label}
          </NavLink>
        ))}
      </nav>

      <Separator className="mx-3 my-4 bg-brand-sidebar-hover" />

      {/* Lobbies */}
      <div className="flex flex-col gap-1 px-3">
        <div className="flex items-center justify-between px-3">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            My Lobbies
          </span>
          <button
            type="button"
            onClick={() => openCreateLobby()}
            className="text-xs font-medium text-brand-green hover:underline"
          >
            + New
          </button>
        </div>

        {lobbiesLoading && (
          <div className="flex flex-col gap-1 px-3 py-1" data-testid="lobbies-loading">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded-lg bg-brand-sidebar-hover"
              />
            ))}
          </div>
        )}

        {!lobbiesLoading && lobbies?.length === 0 && (
          <div className="px-3 py-2">
            <EmptyState
              variant="inline"
              message="No lobbies yet"
              action={{ label: '+ New', onClick: () => openCreateLobby() }}
              className="text-text-muted"
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
          Settings
        </NavLink>
      </div>

      <Separator className="mx-3 bg-brand-sidebar-hover" />

      {/* User Footer */}
      {userLoading && (
        <div className="flex items-center gap-3 px-5 py-4" data-testid="user-loading">
          <div className="h-9 w-9 animate-pulse rounded-full bg-brand-sidebar-hover" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="h-3 w-24 animate-pulse rounded bg-brand-sidebar-hover" />
            <div className="h-3 w-32 animate-pulse rounded bg-brand-sidebar-hover" />
          </div>
        </div>
      )}

      {!userLoading && user && (
        <div className="flex items-center gap-3 px-5 py-4">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-brand-green text-sm font-semibold text-white">
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.username}</p>
            <p className="truncate text-xs text-text-muted">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="flex-shrink-0 text-text-muted hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
