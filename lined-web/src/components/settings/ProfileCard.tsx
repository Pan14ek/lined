import { useState } from 'react';
import type { UserDto } from '@/types';
import { useUpdateUser } from '@/hooks/useUserSettings';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { SettingsCard } from './SettingsCard';
import { SettingsRow, SETTINGS_INPUT_CLASS } from './SettingsRow';

interface ProfileCardProps {
  user: UserDto | undefined;
  isLoading: boolean;
}

function getProfileErrorMessage(error: unknown): string {
  return getApiErrorMessage(
    error,
    {
      409: 'That username or email is already taken',
      400: 'Enter a valid username and email',
    },
    'Something went wrong — please try again',
  );
}

export const ProfileCard = ({ user, isLoading }: ProfileCardProps) => {
  const updateUser = useUpdateUser(user?.id ?? 0);
  const [loadedUserId, setLoadedUserId] = useState<number | undefined>(undefined);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  // Seed the form once the user loads (render-time state adjustment — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  if (user && user.id !== loadedUserId) {
    setLoadedUserId(user.id);
    setUsername(user.username);
    setEmail(user.email);
  }

  if (isLoading || !user) {
    return (
      <SettingsCard id="profile" title="Profile">
        <div className="space-y-3 py-4" data-testid="profile-card-loading">
          <div className="h-16 w-16 animate-pulse rounded-full bg-bg" />
          <div className="h-10 animate-pulse rounded-lg bg-bg" />
          <div className="h-10 animate-pulse rounded-lg bg-bg" />
        </div>
      </SettingsCard>
    );
  }

  const isDirty = username.trim() !== user.username || email.trim() !== user.email;

  function handleSubmit(e: React.FormEvent) {
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
      title="Profile"
      footer={
        <button
          type="submit"
          form="profile-form"
          disabled={!isDirty || updateUser.isPending}
          className="h-[38px] rounded-lg bg-brand-green px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {updateUser.isPending ? 'Saving…' : 'Save changes'}
        </button>
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
            title="Coming soon"
            className="mt-2.5 h-8 rounded-lg border border-border px-3 text-xs text-text-secondary opacity-60"
          >
            Change photo
          </button>
        </div>
      </div>

      <form id="profile-form" onSubmit={handleSubmit}>
        <SettingsRow label="Username">
          <input
            aria-label="Username"
            className={SETTINGS_INPUT_CLASS}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </SettingsRow>
        <SettingsRow label="Email address">
          <input
            aria-label="Email address"
            type="email"
            className={SETTINGS_INPUT_CLASS}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </SettingsRow>
      </form>

      {updateUser.isError && (
        <p role="alert" className="pb-4 text-xs text-red-600">
          {getProfileErrorMessage(updateUser.error)}
        </p>
      )}
    </SettingsCard>
  );
};
