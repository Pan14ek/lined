import { useTranslation } from 'react-i18next';
import { useSettingsStore, type Locale } from '@/store/settings';
import { useUpdateUser } from '@/features/users/hooks/useUserSettings';
import { SettingsCard } from '../SettingsCard';

interface LanguageCardProps {
  userId: number | undefined;
}

const LOCALE_OPTIONS: { value: Locale; flag: string; labelKey: string }[] = [
  { value: 'en', flag: '🇬🇧', labelKey: 'language.english' },
  { value: 'uk', flag: '🇺🇦', labelKey: 'language.ukrainian' },
];

export const LanguageCard = ({ userId }: LanguageCardProps) => {
  const { t } = useTranslation(['settings', 'common']);
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const updateUser = useUpdateUser(userId ?? 0);

  const handleSelect = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
    if (userId != null) {
      updateUser.mutate({ locale: next });
    }
  };

  return (
    <SettingsCard id="language" title={t('language.title')}>
      <div className="py-4">
        <p className="mb-3 text-xs text-text-secondary">{t('language.description')}</p>

        <div role="radiogroup" aria-label={t('language.title')} className="flex flex-col gap-2">
          {LOCALE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm has-[:checked]:border-brand-green has-[:checked]:bg-brand-green-light dark:has-[:checked]:bg-brand-green-light/10"
            >
              <input
                type="radio"
                name="locale"
                role="radio"
                aria-checked={locale === option.value}
                checked={locale === option.value}
                onChange={() => handleSelect(option.value)}
                className="h-4 w-4 accent-brand-green"
              />
              <span aria-hidden="true">{option.flag}</span>
              <span className="text-text-primary">{t(option.labelKey)}</span>
            </label>
          ))}
        </div>

        <div
          data-testid="language-preview"
          className="mt-4 rounded-lg bg-brand-green-light px-4 py-3 text-sm text-brand-green-dark dark:bg-brand-green-light/10 dark:text-brand-green"
        >
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider opacity-80">
            {t('language.previewLabel')}
          </div>
          <div>{t('greeting.morning', { ns: 'common' })} — {t('sidebar.myLobbies', { ns: 'common' })}</div>
        </div>

        {updateUser.isError && (
          <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-400">
            {t('language.saveError')}
          </p>
        )}

        <p className="mt-3 text-xs text-text-secondary">{t('language.appliesNote')}</p>
      </div>
    </SettingsCard>
  );
};
