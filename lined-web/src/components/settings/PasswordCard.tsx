import { useState } from 'react';
import { useUpdateUser } from '@/hooks/useUserSettings';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { SettingsCard } from './SettingsCard';
import { SettingsRow, SETTINGS_INPUT_CLASS } from './SettingsRow';

const MIN_PASSWORD_LENGTH = 8;

interface PasswordCardProps {
  userId: number | undefined;
}

function getPasswordErrorMessage(error: unknown): string {
  return getApiErrorMessage(
    error,
    { 400: 'Enter a valid password' },
    'Something went wrong — please try again',
  );
}

export const PasswordCard = ({ userId }: PasswordCardProps) => {
  const updateUser = useUpdateUser(userId ?? 0);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const validationError =
    password.length > 0 && password.length < MIN_PASSWORD_LENGTH
      ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      : confirmPassword.length > 0 && confirmPassword !== password
        ? 'Passwords do not match'
        : null;

  const canSubmit =
    userId != null &&
    password.length >= MIN_PASSWORD_LENGTH &&
    confirmPassword === password;

  function handleSubmit(e: React.FormEvent) {
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
      title="Password & Security"
      footer={
        <button
          type="submit"
          form="password-form"
          disabled={!password || !confirmPassword || updateUser.isPending}
          className="h-[38px] rounded-lg bg-brand-green px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {updateUser.isPending ? 'Saving…' : 'Change password'}
        </button>
      }
    >
      <p className="pt-3 text-xs text-text-secondary">
        We can&apos;t verify your current password yet — this will update it directly.
      </p>
      <form id="password-form" onSubmit={handleSubmit}>
        <SettingsRow label="New password">
          <input
            aria-label="New password"
            type="password"
            autoComplete="new-password"
            className={SETTINGS_INPUT_CLASS}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </SettingsRow>
        <SettingsRow label="Confirm new password">
          <input
            aria-label="Confirm new password"
            type="password"
            autoComplete="new-password"
            className={SETTINGS_INPUT_CLASS}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </SettingsRow>
      </form>

      {touched && validationError && (
        <p role="alert" className="pb-4 text-xs text-red-600">
          {validationError}
        </p>
      )}
      {updateUser.isError && (
        <p role="alert" className="pb-4 text-xs text-red-600">
          {getPasswordErrorMessage(updateUser.error)}
        </p>
      )}
    </SettingsCard>
  );
};
