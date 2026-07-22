import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS } from './navItems';

/** Primary nav on phones, replacing the sidebar. Hidden at `md` and above. */
export const BottomTabBar = () => {
  const { t } = useTranslation('common');

  return (
    <nav
      aria-label={t('nav.primary')}
      className="fixed inset-x-0 bottom-0 z-30 flex h-16 flex-shrink-0 items-stretch border-t border-border bg-surface md:hidden"
    >
      {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
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
          {t(labelKey)}
        </NavLink>
      ))}
    </nav>
  );
};
