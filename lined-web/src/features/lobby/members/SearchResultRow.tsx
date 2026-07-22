import { useTranslation } from 'react-i18next';
import type { UserSearchResultDto } from '@/features/users/model';
import { cn } from '@/lib/utils';

interface SearchResultRowProps {
  user: UserSearchResultDto;
  isMember: boolean;
  isInvited: boolean;
  isSending: boolean;
  error?: string;
  onInvite: () => void;
}

export const SearchResultRow = ({
  user,
  isMember,
  isInvited,
  isSending,
  error,
  onInvite,
}: SearchResultRowProps) => {
  const { t } = useTranslation('lobby');
  return (
    <div
      className={cn('flex items-center gap-3 rounded-lg p-2.5', isMember && 'bg-brand-green-light')}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
        {user.username.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">{user.username}</p>
        <p className="text-xs text-text-secondary">
          @{user.username}
          {isMember && ` · ${t('search.alreadyInLobby')}`}
        </p>
        {error && <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
      {isMember && <span className="text-lg text-task-done">✓</span>}
      {!isMember && (
        <button
          type="button"
          onClick={onInvite}
          disabled={isInvited || isSending}
          className="h-8 flex-shrink-0 rounded-lg bg-brand-green px-3.5 text-xs font-semibold text-white hover:bg-brand-green-dark disabled:opacity-60"
        >
          {isSending ? t('search.inviting') : isInvited ? t('search.inviteSent') : t('search.invite')}
        </button>
      )}
    </div>
  );
};
