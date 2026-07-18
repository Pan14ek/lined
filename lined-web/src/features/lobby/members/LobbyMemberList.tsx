import { useState } from 'react';
import type { LobbyDto } from '@/features/lobby/model';
import type { UserDto } from '@/features/users/model';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser';
import { useUpdateLobbyOwner, useRemoveMember } from '@/features/lobby/hooks/useLobbies';
import { useLobbyInvites } from '@/features/lobby/hooks/useInvites';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MemberListContent } from './MemberListContent';
import { PendingInvitesSection } from './PendingInvitesSection';

type PendingActionKind = 'makeOwner' | 'remove';
type PendingAction = { kind: PendingActionKind; member: UserDto } | null;

const MEMBER_ACTION_CONFIG: Record<
  PendingActionKind,
  {
    title: string;
    confirmLabel: string;
    danger: boolean;
    getMessage: (member: UserDto, lobbyName: string) => string;
  }
> = {
  makeOwner: {
    title: 'Make owner',
    confirmLabel: 'Make owner',
    danger: false,
    getMessage: (member, lobbyName) =>
      `Make @${member.username} the owner of "${lobbyName}"? You will become a regular member.`,
  },
  remove: {
    title: 'Remove member',
    confirmLabel: 'Remove',
    danger: true,
    getMessage: (member, lobbyName) =>
      `Remove @${member.username} from "${lobbyName}"? They will lose access to shared events and tasks.`,
  },
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
          title={MEMBER_ACTION_CONFIG[pendingAction.kind].title}
          message={MEMBER_ACTION_CONFIG[pendingAction.kind].getMessage(
            pendingAction.member,
            lobby.name,
          )}
          confirmLabel={MEMBER_ACTION_CONFIG[pendingAction.kind].confirmLabel}
          danger={MEMBER_ACTION_CONFIG[pendingAction.kind].danger}
          isPending={updateOwner.isPending || removeMember.isPending}
          error={actionError}
          onConfirm={handleConfirm}
          onCancel={closeDialog}
        />
      )}
    </div>
  );
};
