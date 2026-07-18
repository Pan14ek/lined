import { useEffect } from 'react';
import { useSettingsStore, type Theme } from '@/store/settings';
import { SettingsCard } from '../SettingsCard';
import { SettingsRow, SETTINGS_INPUT_CLASS } from '../SettingsRow';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const resolvesToDark = (theme: Theme): boolean => {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export const AppearanceCard = () => {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvesToDark(theme));
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => document.documentElement.classList.toggle('dark', media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme]);

  return (
    <SettingsCard id="appearance" title="Appearance">
      <SettingsRow label="Theme" description="Choose your preferred colour scheme">
        <select
          aria-label="Theme"
          className={SETTINGS_INPUT_CLASS}
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
        >
          {THEME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </SettingsRow>
    </SettingsCard>
  );
};
