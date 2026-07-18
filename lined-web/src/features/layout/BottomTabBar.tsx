import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';

/** Primary nav on phones, replacing the sidebar. Hidden at `md` and above. */
export const BottomTabBar = () => (
  <nav
    aria-label="Primary"
    className="fixed inset-x-0 bottom-0 z-30 flex h-16 flex-shrink-0 items-stretch border-t border-border bg-surface md:hidden"
  >
    {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        className={({ isActive }) =>
          `flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium ${
            isActive ? 'text-brand-green' : 'text-text-secondary'
          }`
        }
      >
        <Icon className="h-5 w-5" />
        {label}
      </NavLink>
    ))}
  </nav>
);
