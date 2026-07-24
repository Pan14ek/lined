import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMyInvites, useAcceptInvite, useDeclineInvite } from '@/features/lobby/hooks/useInvites';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { InviteCard } from './InviteCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadErrorState } from '@/components/LoadErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard } from '@/components/skeletons/SkeletonCard';
import { useQueryStall } from '@/hooks/useQueryStall';

const getInviteErrorMessage = (
  error: unknown,
  fallback: string,
  staleInviteMessage: string,
): string => {
  return getApiErrorMessage(error, { 409: staleInviteMessage }, fallback);
}

export const PendingInvitesBanner = () => {
  const { t } = useTranslation('notifications');
  const { data: invites, isLoading, isError, refetch } = useMyInvites();
  const acceptInvite = useAcceptInvite();
  const declineInvite = useDeclineInvite();
  const navigate = useNavigate();
  const [cardErrors, setCardErrors] = useState<Record<number, string>>({});
  const [decliningInviteId, setDecliningInviteId] = useState<number | null>(null);
  const isStalled = useQueryStall(isLoading);

  const setCardError = (inviteId: number, message: string) =>
    setCardErrors((prev) => ({ ...prev, [inviteId]: message }));

  const handleAccept = (inviteId: number, lobbyId: number) => {
    setCardError(inviteId, '');
    acceptInvite.mutate(inviteId, {
      onSuccess: () => navigate(`/lobbies/${lobbyId}`),
      onError: (error) => {
        setCardError(
          inviteId,
          getInviteErrorMessage(error, t('errors.acceptFailed'), t('errors.staleInvite')),
        );
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
        setCardError(
          inviteId,
          getInviteErrorMessage(error, t('errors.declineFailed'), t('errors.staleInvite')),
        );
        setDecliningInviteId(null);
        void refetch();
      },
    });
  };

  if (isStalled || (!isLoading && isError)) {
    return <LoadErrorState onRetry={() => void refetch()} message={t('pendingInvites.loadError')} />;
  }

  if (isLoading) {
    return (
      <section data-testid="pending-invites-loading">
        <Skeleton className="mb-3 h-4 w-40 rounded" />
        <SkeletonCard />
      </section>
    );
  }

  if (!invites || invites.length === 0) return null;

  const decliningInvite = invites.find((i) => i.id === decliningInviteId);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">
          {t('pendingInvites.title', { count: invites.length })}
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
          title={t('declineDialog.title')}
          message={t('declineDialog.message')}
          confirmLabel={t('declineDialog.confirmLabel')}
          danger
          isPending={declineInvite.isPending}
          onConfirm={handleDeclineConfirm}
          onCancel={() => setDecliningInviteId(null)}
        />
      )}
    </section>
  );
};
