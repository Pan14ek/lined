import type { LobbyDto } from '@/features/lobby/model';
import type { UserDto } from '@/features/users/model';
import type { useUsers } from '@/features/users/hooks/useUsers';
import { MemberCard } from './MemberCard';

interface MemberListContentProps {
  memberQueries: ReturnType<typeof useUsers>;
  lobby: LobbyDto;
  currentUserId: number | undefined;
  isOwnerViewer: boolean;
  onMakeOwner: (member: UserDto) => void;
  onRemove: (member: UserDto) => void;
}

export const MemberListContent = ({
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
