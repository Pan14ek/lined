import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { UserDto } from '@/features/users/model';
import { useUpdateCurrentUser } from '@/features/users/hooks/useUserSettings';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { Button } from '@/components/Button';
import { LoadErrorState } from '@/components/LoadErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryStall } from '@/hooks/useQueryStall';
import { SettingsCard } from '../SettingsCard';
import { SettingsRow, SETTINGS_INPUT_CLASS } from '../SettingsRow';

interface ProfileCardProps {
  user: UserDto | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

const getProfileErrorMessage = (error: unknown, t: TFunction<['settings', 'common']>): string => {
  return getApiErrorMessage(
    error,
    {
      409: t('profile.errorTaken', { ns: 'settings' }),
      400: t('profile.errorInvalid', { ns: 'settings' }),
    },
    t('errors.generic', { ns: 'common' }),
  );
}

export const ProfileCard = ({ user, isLoading, isError, onRetry }: ProfileCardProps) => {
  const { t } = useTranslation(['settings', 'common']);
  const updateUser = useUpdateCurrentUser();
  const [loadedUserId, setLoadedUserId] = useState<number | undefined>(undefined);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const isStalled = useQueryStall(isLoading);

  // Seed the form once the user loads (render-time state adjustment — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  if (user && user.id !== loadedUserId) {
    setLoadedUserId(user.id);
    setUsername(user.username);
    setEmail(user.email);
  }

  if (isStalled || (!isLoading && isError)) {
    return (
      <SettingsCard id="profile" title={t('profile.title')}>
        <LoadErrorState onRetry={onRetry} message={t('profile.loadError')} />
      </SettingsCard>
    );
  }

  if (isLoading || !user) {
    return (
      <SettingsCard id="profile" title={t('profile.title')}>
        <div className="space-y-3 py-4" data-testid="profile-card-loading">
          <Skeleton className="size-16 rounded-full" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      </SettingsCard>
    );
  }

  const isDirty = username.trim() !== user.username || email.trim() !== user.email;

  const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !isDirty) return;
        updateUser.mutate({
          ...(username.trim() !== user.username ? { username: username.trim() } : {}),
          ...(email.trim() !== user.email ? { email: email.trim() } : {}),
        });
      }

  return (
    <SettingsCard
      id="profile"
      title={t('profile.title')}
      footer={
        <Button
          type="submit"
          form="profile-form"
          disabled={!isDirty}
          pending={updateUser.isPending}
          className="h-[38px] px-5"
        >
          {t('profile.saveChanges')}
        </Button>
      }
    >
      <div className="flex items-center gap-4 border-b border-border py-5">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-brand-green text-2xl font-bold text-white">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-[15px] font-semibold text-text-primary">{user.username}</div>
          <div className="mt-0.5 text-[13px] text-text-secondary">{user.email}</div>
          <button
            type="button"
            disabled
            title={t('profile.comingSoon')}
            className="mt-2.5 h-8 rounded-lg border border-border px-3 text-xs text-text-secondary opacity-60"
          >
            {t('profile.changePhoto')}
          </button>
        </div>
      </div>

      <form id="profile-form" onSubmit={handleSubmit}>
        <SettingsRow label={t('profile.username')}>
          <input
            aria-label={t('profile.username')}
            className={SETTINGS_INPUT_CLASS}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </SettingsRow>
        <SettingsRow label={t('profile.email')}>
          <input
            aria-label={t('profile.email')}
            type="email"
            className={SETTINGS_INPUT_CLASS}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </SettingsRow>
      </form>

      {updateUser.isError && (
        <p role="alert" className="pb-4 text-xs text-red-600 dark:text-red-400">
          {getProfileErrorMessage(updateUser.error, t)}
        </p>
      )}
    </SettingsCard>
  );
};
