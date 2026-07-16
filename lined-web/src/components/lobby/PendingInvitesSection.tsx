import { useState } from 'react';
import type { LobbyInviteDto } from '@/types';
import { useResendInvite, useCancelInvite } from '@/hooks/useInvites';
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
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  const clearRowError = (inviteId: number) =>
    setRowErrors((prev) => {
      if (!(inviteId in prev)) return prev;
      const next = { ...prev };
      delete next[inviteId];
      return next;
    });

  const handleResend = (inviteId: number) => {
    setBusyId(inviteId);
    clearRowError(inviteId);
    resendInvite.mutate(inviteId, {
      onSettled: () => setBusyId(null),
      onError: () =>
        setRowErrors((prev) => ({ ...prev, [inviteId]: "Couldn't resend — try again" })),
    });
  };

  const handleCancel = (inviteId: number) => {
    setBusyId(inviteId);
    clearRowError(inviteId);
    cancelInvite.mutate(inviteId, {
      onSettled: () => setBusyId(null),
      onError: () =>
        setRowErrors((prev) => ({ ...prev, [inviteId]: "Couldn't cancel — try again" })),
    });
  };

  return (
    <div className="mt-6">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">Pending Invites</h3>

      {isLoading && (
        <div className="h-16 animate-pulse rounded-xl bg-white" data-testid="pending-invites-loading" />
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
