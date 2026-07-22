import { useTranslation } from 'react-i18next';
import type { LobbyInviteDto } from '@/features/lobby/model';
import { useUser } from '@/features/users/hooks/useUsers';

interface PendingInviteRowProps {
  invite: LobbyInviteDto;
  onResend: () => void;
  onCancel: () => void;
  isResending: boolean;
  isCancelling: boolean;
  error?: string;
}

export const PendingInviteRow = ({
  invite,
  onResend,
  onCancel,
  isResending,
  isCancelling,
  error,
}: PendingInviteRowProps) => {
  const { t } = useTranslation('lobby');
  const { data: invitee, isLoading } = useUser(invite.inviteeId);
  const sentAt = new Date(invite.sentAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex items-center gap-3.5 rounded-xl bg-surface p-4 shadow-[var(--shadow-sm)]">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-muted text-lg text-text-secondary">
        ?
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">
          {isLoading
            ? t('pendingInvites.loading')
            : (invitee?.username ?? t('pendingInvites.userFallback', { id: invite.inviteeId }))}
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">{t('pendingInvites.sentAt', { date: sentAt })}</p>
        {error && <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
      <button
        type="button"
        onClick={onResend}
        disabled={isResending || isCancelling}
        className="h-8 flex-shrink-0 rounded-lg border border-border px-3 text-xs font-medium text-text-primary hover:bg-surface-hover disabled:opacity-60"
      >
        {isResending ? t('pendingInvites.resending') : t('pendingInvites.resend')}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isResending || isCancelling}
        className="h-8 flex-shrink-0 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        {isCancelling ? t('pendingInvites.cancelling') : t('pendingInvites.cancel')}
      </button>
    </div>
  );
};
