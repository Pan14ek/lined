import type { LobbyInviteDto } from '@/features/lobby/model';
import { useResendInvite, useCancelInvite } from '@/features/lobby/hooks/useInvites';
import { useRowMutationState } from '@/hooks/useRowMutationState';
import { PendingInviteRow } from './PendingInviteRow';

interface PendingInvitesSectionProps {
  lobbyId: number;
  invites: LobbyInviteDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

export const PendingInvitesSection = ({
  lobbyId,
  invites,
  isLoading,
  isError,
}: PendingInvitesSectionProps) => {
  const resendInvite = useResendInvite(lobbyId);
  const cancelInvite = useCancelInvite(lobbyId);
  const { busyId, errors: rowErrors, start, finish, setError } = useRowMutationState();

  const handleResend = (inviteId: number) => {
    start(inviteId);
    resendInvite.mutate(inviteId, {
      onSettled: finish,
      onError: () => setError(inviteId, "Couldn't resend — try again"),
    });
  };

  const handleCancel = (inviteId: number) => {
    start(inviteId);
    cancelInvite.mutate(inviteId, {
      onSettled: finish,
      onError: () => setError(inviteId, "Couldn't cancel — try again"),
    });
  };

  return (
    <div className="mt-6">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">Pending Invites</h3>

      {isLoading && (
        <div className="h-16 animate-pulse rounded-xl bg-surface" data-testid="pending-invites-loading" />
      )}

      {!isLoading && isError && (
        <p className="text-sm text-text-secondary">Couldn&apos;t load pending invites.</p>
      )}

      {!isLoading && !isError && (invites == null || invites.length === 0) && (
        <p className="text-sm text-text-secondary">No pending invites.</p>
      )}

      {!isLoading && !isError && invites && invites.length > 0 && (
        <div className="flex flex-col gap-2">
          {invites.map((invite) => (
            <PendingInviteRow
              key={invite.id}
              invite={invite}
              onResend={() => handleResend(invite.id)}
              onCancel={() => handleCancel(invite.id)}
              isResending={busyId === invite.id && resendInvite.isPending}
              isCancelling={busyId === invite.id && cancelInvite.isPending}
              error={rowErrors[invite.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
};
