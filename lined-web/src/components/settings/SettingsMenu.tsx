interface SettingsMenuSection {
  label: string;
  items: { id: string; label: string; danger?: boolean }[];
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
    items: [{ id: 'appearance', label: 'Appearance' }],
  },
  {
    label: 'DANGER',
    items: [{ id: 'danger-zone', label: 'Delete Account', danger: true }],
  },
];

/** Left-hand anchor jump list for the single-scroll settings page. */
export const SettingsMenu = () => (
  <nav className="w-[220px] flex-shrink-0 border-r border-border bg-white py-5">
    {SECTIONS.map((section) => (
      <div key={section.label}>
        <div className="px-5 py-1.5 text-[11px] font-semibold tracking-wider text-text-muted">
          {section.label}
        </div>
        {section.items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`block border-l-[3px] border-transparent px-5 py-2.5 text-sm ${
              item.danger ? 'text-red-600' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>
    ))}
  </nav>
);
