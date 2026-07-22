import { useTranslation } from 'react-i18next';
import { useSettingsStore, type Theme } from '@/store/settings';
import { SettingsCard } from '../SettingsCard';
import { SettingsRow, SETTINGS_INPUT_CLASS } from '../SettingsRow';

const THEME_OPTION_KEYS = [
  { value: 'light', labelKey: 'appearance.light' },
  { value: 'dark', labelKey: 'appearance.dark' },
  { value: 'system', labelKey: 'appearance.system' },
] as const satisfies readonly { value: Theme; labelKey: 'appearance.light' | 'appearance.dark' | 'appearance.system' }[];

export const AppearanceCard = () => {
  const { t } = useTranslation('settings');
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  return (
    <SettingsCard id="appearance" title={t('appearance.title')}>
      <SettingsRow label={t('appearance.theme')} description={t('appearance.themeDescription')}>
        <select
          aria-label={t('appearance.theme')}
          className={SETTINGS_INPUT_CLASS}
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
        >
          {THEME_OPTION_KEYS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </SettingsRow>
    </SettingsCard>
  );
};
