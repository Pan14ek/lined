import type { LobbyInviteDto } from '@/types';
import { useUser } from '@/hooks/useUsers';

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
  const { data: invitee, isLoading } = useUser(invite.inviteeId);
  const sentAt = new Date(invite.sentAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex items-center gap-3.5 rounded-xl bg-white p-4 shadow-[var(--shadow-sm)]">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-lg text-text-secondary">
        ?
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">
          {isLoading ? 'Loading…' : (invitee?.username ?? `User #${invite.inviteeId}`)}
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">Invite sent · {sentAt}</p>
        {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
      </div>
      <button
        type="button"
        onClick={onResend}
        disabled={isResending || isCancelling}
        className="h-8 flex-shrink-0 rounded-lg border border-border px-3 text-xs font-medium text-text-primary hover:bg-gray-50 disabled:opacity-60"
      >
        {isResending ? 'Resending…' : 'Resend'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isResending || isCancelling}
        className="h-8 flex-shrink-0 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        {isCancelling ? 'Cancelling…' : 'Cancel'}
      </button>
    </div>
  );
};
