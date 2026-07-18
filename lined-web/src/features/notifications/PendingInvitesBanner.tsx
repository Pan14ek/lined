import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyInvites, useAcceptInvite, useDeclineInvite } from '@/features/lobby/hooks/useInvites';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { InviteCard } from './InviteCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const STALE_INVITE_MESSAGE = 'This invite is no longer valid';

const getInviteErrorMessage = (error: unknown, fallback: string): string => {
  return getApiErrorMessage(error, { 409: STALE_INVITE_MESSAGE }, fallback);
}

export const PendingInvitesBanner = () => {
  const { data: invites, isLoading, isError, refetch } = useMyInvites();
  const acceptInvite = useAcceptInvite();
  const declineInvite = useDeclineInvite();
  const navigate = useNavigate();
  const [cardErrors, setCardErrors] = useState<Record<number, string>>({});
  const [decliningInviteId, setDecliningInviteId] = useState<number | null>(null);

  const setCardError = (inviteId: number, message: string) =>
    setCardErrors((prev) => ({ ...prev, [inviteId]: message }));

  const handleAccept = (inviteId: number, lobbyId: number) => {
    setCardError(inviteId, '');
    acceptInvite.mutate(inviteId, {
      onSuccess: () => navigate(`/lobbies/${lobbyId}`),
      onError: (error) => {
        setCardError(inviteId, getInviteErrorMessage(error, 'Could not accept — please try again'));
        void refetch();
      },
    });
  };

  const handleDeclineConfirm = () => {
    if (decliningInviteId == null) return;
    const inviteId = decliningInviteId;
    setCardError(inviteId, '');
    declineInvite.mutate(inviteId, {
      onSuccess: () => setDecliningInviteId(null),
      onError: (error) => {
        setCardError(inviteId, getInviteErrorMessage(error, 'Could not decline — please try again'));
        setDecliningInviteId(null);
        void refetch();
      },
    });
  };

  if (isLoading) {
    return (
      <section data-testid="pending-invites-loading">
        <div className="mb-3 h-4 w-40 animate-pulse rounded bg-white" />
        <div className="h-16 animate-pulse rounded-xl bg-white" />
      </section>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-text-secondary">
        Couldn&apos;t load your invites. Try again later.
      </p>
    );
  }

  if (!invites || invites.length === 0) return null;

  const decliningInvite = invites.find((i) => i.id === decliningInviteId);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">
          Pending Invites · {invites.length}
        </h2>
      </div>
      {invites.map((invite) => (
        <InviteCard
          key={invite.id}
          invite={invite}
          onAccept={() => handleAccept(invite.id, invite.lobbyId)}
          onDecline={() => setDecliningInviteId(invite.id)}
          isAccepting={acceptInvite.isPending && acceptInvite.variables === invite.id}
          isDeclining={declineInvite.isPending && declineInvite.variables === invite.id}
          error={cardErrors[invite.id] || undefined}
        />
      ))}

      {decliningInvite && (
        <ConfirmDialog
          title="Decline invite"
          message="Decline this lobby invite? You can be invited again later."
          confirmLabel="Decline"
          danger
          isPending={declineInvite.isPending}
          onConfirm={handleDeclineConfirm}
          onCancel={() => setDecliningInviteId(null)}
        />
      )}
    </section>
  );
};
