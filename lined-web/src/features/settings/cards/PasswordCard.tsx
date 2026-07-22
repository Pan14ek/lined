import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useUpdateUser } from '@/features/users/hooks/useUserSettings';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { SettingsCard } from '../SettingsCard';
import { SettingsRow, SETTINGS_INPUT_CLASS } from '../SettingsRow';

const MIN_PASSWORD_LENGTH = 8;

interface PasswordCardProps {
  userId: number | undefined;
}

const getPasswordErrorMessage = (error: unknown, t: TFunction<['settings', 'common']>): string => {
  return getApiErrorMessage(
    error,
    { 400: t('password.errorInvalid', { ns: 'settings' }) },
    t('errors.generic', { ns: 'common' }),
  );
}

export const PasswordCard = ({ userId }: PasswordCardProps) => {
  const { t } = useTranslation(['settings', 'common']);
  const updateUser = useUpdateUser(userId ?? 0);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const validationError =
    password.length > 0 && password.length < MIN_PASSWORD_LENGTH
      ? t('password.errorTooShort', { count: MIN_PASSWORD_LENGTH })
      : confirmPassword.length > 0 && confirmPassword !== password
        ? t('password.errorMismatch')
        : null;

  const canSubmit =
    userId != null &&
    password.length >= MIN_PASSWORD_LENGTH &&
    confirmPassword === password;

  const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (!canSubmit) return;
        updateUser.mutate(
          { password },
          {
            onSuccess: () => {
              setPassword('');
              setConfirmPassword('');
              setTouched(false);
            },
          },
        );
      }

  return (
    <SettingsCard
      id="password"
      title={t('password.title')}
      footer={
        <button
          type="submit"
          form="password-form"
          disabled={!password || !confirmPassword || updateUser.isPending}
          className="h-[38px] rounded-lg bg-brand-green px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {updateUser.isPending ? t('password.saving') : t('password.changePassword')}
        </button>
      }
    >
      <p className="pt-3 text-xs text-text-secondary">{t('password.cannotVerifyNote')}</p>
      <form id="password-form" onSubmit={handleSubmit}>
        <SettingsRow label={t('password.newPassword')}>
          <input
            aria-label={t('password.newPassword')}
            type="password"
            autoComplete="new-password"
            className={SETTINGS_INPUT_CLASS}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </SettingsRow>
        <SettingsRow label={t('password.confirmNewPassword')}>
          <input
            aria-label={t('password.confirmNewPassword')}
            type="password"
            autoComplete="new-password"
            className={SETTINGS_INPUT_CLASS}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </SettingsRow>
      </form>

      {touched && validationError && (
        <p role="alert" className="pb-4 text-xs text-red-600 dark:text-red-400">
          {validationError}
        </p>
      )}
      {updateUser.isError && (
        <p role="alert" className="pb-4 text-xs text-red-600 dark:text-red-400">
          {getPasswordErrorMessage(updateUser.error, t)}
        </p>
      )}
    </SettingsCard>
  );
};
