import { useState } from 'react';
import type { LobbyDto, LobbyInviteDto, UserDto } from '@/types';
import { useUsers } from '@/hooks/useUsers';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUpdateLobbyOwner, useRemoveMember } from '@/hooks/useLobbies';
import { useLobbyInvites, useResendInvite, useCancelInvite } from '@/hooks/useInvites';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MemberCard } from './MemberCard';
import { PendingInviteRow } from './PendingInviteRow';

type PendingAction = { kind: 'makeOwner' | 'remove'; member: UserDto } | null;

interface MemberListContentProps {
  memberQueries: ReturnType<typeof useUsers>;
  lobby: LobbyDto;
  currentUserId: number | undefined;
  isOwnerViewer: boolean;
  onMakeOwner: (member: UserDto) => void;
  onRemove: (member: UserDto) => void;
}

const MemberListContent = ({
  memberQueries,
  lobby,
  currentUserId,
  isOwnerViewer,
  onMakeOwner,
  onRemove,
}: MemberListContentProps) => {
  if (memberQueries.some((q) => q.isLoading)) {
    return (
      <div className="flex flex-col gap-2" data-testid="lobby-members-loading">
        {[0, 1].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-white" />
        ))}
      </div>
    );
  }

  if (memberQueries.some((q) => q.isError)) {
    return <p className="text-sm text-text-secondary">Couldn&apos;t load members. Try again later.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {memberQueries.map((q, i) => {
        const member = q.data;
        if (!member) return null;
        const memberId = lobby.memberIds[i];
        return (
          <MemberCard
            key={memberId}
            member={member}
            isOwner={memberId === lobby.ownerId}
            isCurrentUser={memberId === currentUserId}
            canManage={isOwnerViewer}
            onMakeOwner={() => onMakeOwner(member)}
            onRemove={() => onRemove(member)}
          />
        );
      })}
    </div>
  );
};

interface PendingInvitesSectionProps {
  lobbyId: number;
  invites: LobbyInviteDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

const PendingInvitesSection = ({
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

interface LobbyMemberListProps {
  lobby: LobbyDto;
}

export const LobbyMemberList = ({ lobby }: LobbyMemberListProps) => {
  const { data: currentUser } = useCurrentUser();
  const memberQueries = useUsers(lobby.memberIds);
  const isOwnerViewer = currentUser != null && currentUser.id === lobby.ownerId;

  const invitesQuery = useLobbyInvites(isOwnerViewer ? lobby.id : undefined);

  const updateOwner = useUpdateLobbyOwner(lobby.id);
  const removeMember = useRemoveMember(lobby.id);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const closeDialog = () => {
    setPendingAction(null);
    setActionError(null);
  };

  const handleConfirm = () => {
    if (!pendingAction) return;
    setActionError(null);
    if (pendingAction.kind === 'makeOwner') {
      updateOwner.mutate(pendingAction.member.id, {
        onSuccess: () => closeDialog(),
        onError: () => setActionError('Could not transfer ownership — please try again'),
      });
    } else {
      removeMember.mutate(pendingAction.member.id, {
        onSuccess: () => closeDialog(),
        onError: () => setActionError('Could not remove this member — please try again'),
      });
    }
  };

  return (
    <div className="p-6">
      <div className="mb-5">
        <span className="text-sm font-semibold text-text-primary">
          Members · {lobby.memberIds.length}
        </span>
      </div>

      <MemberListContent
        memberQueries={memberQueries}
        lobby={lobby}
        currentUserId={currentUser?.id}
        isOwnerViewer={isOwnerViewer}
        onMakeOwner={(member) => setPendingAction({ kind: 'makeOwner', member })}
        onRemove={(member) => setPendingAction({ kind: 'remove', member })}
      />

      {isOwnerViewer && (
        <PendingInvitesSection
          lobbyId={lobby.id}
          invites={invitesQuery.data}
          isLoading={invitesQuery.isLoading}
          isError={invitesQuery.isError}
        />
      )}

      {pendingAction && (
        <ConfirmDialog
          title={pendingAction.kind === 'makeOwner' ? 'Make owner' : 'Remove member'}
          message={
            pendingAction.kind === 'makeOwner'
              ? `Make @${pendingAction.member.username} the owner of "${lobby.name}"? You will become a regular member.`
              : `Remove @${pendingAction.member.username} from "${lobby.name}"? They will lose access to shared events and tasks.`
          }
          confirmLabel={pendingAction.kind === 'makeOwner' ? 'Make owner' : 'Remove'}
          danger={pendingAction.kind === 'remove'}
          isPending={updateOwner.isPending || removeMember.isPending}
          error={actionError}
          onConfirm={handleConfirm}
          onCancel={closeDialog}
        />
      )}
    </div>
  );
};
