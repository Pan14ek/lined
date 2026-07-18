import { Link } from 'react-router-dom';

interface SettingsMenuSection {
  label: string;
  items: { id: string; label: string; danger?: boolean; route?: string }[];
}

const SECTIONS: SettingsMenuSection[] = [
  {
    label: 'ACCOUNT',
    items: [
      { id: 'profile', label: 'Profile' },
      { id: 'password', label: 'Password & Security' },
      { id: 'notifications', label: 'Notifications' },
    ],
  },
  {
    label: 'PREFERENCES',
    items: [
      { id: 'appearance', label: 'Appearance' },
      { id: 'subscription', label: 'Subscription', route: '/subscription' },
    ],
  },
  {
    label: 'DANGER',
    items: [{ id: 'danger-zone', label: 'Delete Account', danger: true }],
  },
];

const menuItemClass = (danger?: boolean): string => {
  return `block border-l-[3px] border-transparent px-5 py-2.5 text-sm ${
    danger ? 'text-red-600' : 'text-text-secondary hover:text-text-primary'
  }`;
}

/** Left-hand jump list for the settings page — most items scroll-anchor within the
 * single-scroll page; items with a `route` navigate to a separate page instead. */
export const SettingsMenu = () => (
  <nav className="w-full flex-shrink-0 border-b border-border bg-surface py-5 md:w-[220px] md:border-b-0 md:border-r">
    {SECTIONS.map((section) => (
      <div key={section.label}>
        <div className="px-5 py-1.5 text-[11px] font-semibold tracking-wider text-text-muted">
          {section.label}
        </div>
        {section.items.map((item) =>
          item.route ? (
            <Link key={item.id} to={item.route} className={menuItemClass(item.danger)}>
              {item.label}
            </Link>
          ) : (
            <a key={item.id} href={`#${item.id}`} className={menuItemClass(item.danger)}>
              {item.label}
            </a>
          ),
        )}
      </div>
    ))}
  </nav>
);
