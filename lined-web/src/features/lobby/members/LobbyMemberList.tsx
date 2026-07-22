import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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

const getMemberActionConfig = (t: TFunction<'lobby'>): Record<
  PendingActionKind,
  {
    title: string;
    confirmLabel: string;
    danger: boolean;
    getMessage: (member: UserDto, lobbyName: string) => string;
  }
> => ({
  makeOwner: {
    title: t('members.makeOwnerTitle'),
    confirmLabel: t('members.makeOwnerConfirm'),
    danger: false,
    getMessage: (member, lobbyName) =>
      t('members.makeOwnerMessage', { username: member.username, lobbyName }),
  },
  remove: {
    title: t('members.removeTitle'),
    confirmLabel: t('members.removeConfirm'),
    danger: true,
    getMessage: (member, lobbyName) =>
      t('members.removeMessage', { username: member.username, lobbyName }),
  },
});

interface LobbyMemberListProps {
  lobby: LobbyDto;
}

export const LobbyMemberList = ({ lobby }: LobbyMemberListProps) => {
  const { t } = useTranslation('lobby');
  const memberActionConfig = getMemberActionConfig(t);
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
        onError: () => setActionError(t('members.makeOwnerError')),
      });
    } else {
      removeMember.mutate(pendingAction.member.id, {
        onSuccess: () => closeDialog(),
        onError: () => setActionError(t('members.removeError')),
      });
    }
  };

  return (
    <div className="p-6">
      <div className="mb-5">
        <span className="text-sm font-semibold text-text-primary">
          {t('members.heading', { count: lobby.memberIds.length })}
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
          title={memberActionConfig[pendingAction.kind].title}
          message={memberActionConfig[pendingAction.kind].getMessage(
            pendingAction.member,
            lobby.name,
          )}
          confirmLabel={memberActionConfig[pendingAction.kind].confirmLabel}
          danger={memberActionConfig[pendingAction.kind].danger}
          isPending={updateOwner.isPending || removeMember.isPending}
          error={actionError}
          onConfirm={handleConfirm}
          onCancel={closeDialog}
        />
      )}
    </div>
  );
};
