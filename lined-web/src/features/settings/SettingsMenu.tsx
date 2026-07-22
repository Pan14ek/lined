import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface SettingsMenuSection {
  sectionKey: string;
  items: { id: string; labelKey: string; danger?: boolean; route?: string }[];
}

const SECTIONS: SettingsMenuSection[] = [
  {
    sectionKey: 'menu.sectionAccount',
    items: [
      { id: 'profile', labelKey: 'menu.profile' },
      { id: 'password', labelKey: 'menu.password' },
      { id: 'notifications', labelKey: 'menu.notifications' },
    ],
  },
  {
    sectionKey: 'menu.sectionPreferences',
    items: [
      { id: 'appearance', labelKey: 'menu.appearance' },
      { id: 'language', labelKey: 'menu.language' },
      { id: 'subscription', labelKey: 'menu.subscription', route: '/subscription' },
    ],
  },
  {
    sectionKey: 'menu.sectionDanger',
    items: [{ id: 'danger-zone', labelKey: 'menu.deleteAccount', danger: true }],
  },
];

const menuItemClass = (danger?: boolean): string => {
  return `block border-l-[3px] border-transparent px-5 py-2.5 text-sm ${
    danger ? 'text-red-600 dark:text-red-400' : 'text-text-secondary hover:text-text-primary'
  }`;
}

/** Left-hand jump list for the settings page — most items scroll-anchor within the
 * single-scroll page; items with a `route` navigate to a separate page instead. */
export const SettingsMenu = () => {
  const { t } = useTranslation('settings');

  return (
    <nav className="w-full flex-shrink-0 border-b border-border bg-surface py-5 md:w-[220px] md:border-b-0 md:border-r">
      {SECTIONS.map((section) => (
        <div key={section.sectionKey}>
          <div className="px-5 py-1.5 text-[11px] font-semibold tracking-wider text-text-muted">
            {t(section.sectionKey)}
          </div>
          {section.items.map((item) =>
            item.route ? (
              <Link key={item.id} to={item.route} className={menuItemClass(item.danger)}>
                {t(item.labelKey)}
              </Link>
            ) : (
              <a key={item.id} href={`#${item.id}`} className={menuItemClass(item.danger)}>
                {t(item.labelKey)}
              </a>
            ),
          )}
        </div>
      ))}
    </nav>
  );
};
