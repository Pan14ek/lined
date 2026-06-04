import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, ListTodo, Settings } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks' },
] as const;

const LOBBY_DOTS: { id: number; name: string; color: string }[] = [
  { id: 1, name: 'Alex & Anastasiia', color: 'bg-lobby-couple' },
  { id: 2, name: 'Johnson Family', color: 'bg-lobby-family' },
  { id: 3, name: 'Weekend Crew', color: 'bg-lobby-friends' },
];

export function Sidebar() {
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
        <span className="px-3 text-xs font-medium uppercase tracking-wider text-text-muted">
          Lobbies
        </span>
        {LOBBY_DOTS.map((lobby) => (
          <NavLink
            key={lobby.id}
            to={`/lobbies/${lobby.id}`}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-brand-green text-white'
                  : 'text-text-light hover:bg-brand-sidebar-hover'
              }`
            }
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${lobby.color}`}
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
      <div className="flex items-center gap-3 px-5 py-4">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-brand-green text-sm font-semibold text-white">
            A
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            Alex Johnson
          </p>
          <p className="truncate text-xs text-text-muted">@alex_johnson</p>
        </div>
      </div>
    </aside>
  );
}
