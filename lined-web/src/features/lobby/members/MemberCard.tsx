import { useTranslation } from 'react-i18next';
import type { UserDto } from '@/features/users/model';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatMonthYear } from '@/features/calendar/lib/calendarUtils';
import { cn } from '@/lib/utils';

interface MemberCardProps {
  member: UserDto;
  isOwner: boolean;
  isCurrentUser: boolean;
  /** Whether the viewer (current user) may manage this member — owner-only actions. */
  canManage: boolean;
  onMakeOwner: () => void;
  onRemove: () => void;
}

export const MemberCard = ({
  member,
  isOwner,
  isCurrentUser,
  canManage,
  onMakeOwner,
  onRemove,
}: MemberCardProps) => {
  const { t } = useTranslation('lobby');
  return (
    <div className="flex items-center gap-4 rounded-lg bg-surface p-4 shadow-[var(--shadow-sm)]">
      <Avatar size="lg">
        <AvatarFallback className="bg-brand-green text-sm font-semibold text-white">
          {member.username.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-text-primary">{member.username}</p>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              isOwner ? 'bg-brand-green/10 text-brand-green' : 'bg-surface-hover text-text-secondary',
            )}
          >
            {isOwner ? t('members.ownerBadge') : t('members.memberBadge')}
          </span>
        </div>
        <p className="text-xs text-text-secondary">@{member.username}</p>
        {/* No "joined lobby at" timestamp exists on the API — substitute the account creation date. */}
        <p className="text-xs text-text-muted">
          {t('members.memberSince', { date: formatMonthYear(new Date(member.createdAt)) })}
        </p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {isCurrentUser && (
          <span className="px-2 text-xs text-text-muted">{t('members.thatsYou')}</span>
        )}
        {!isCurrentUser && canManage && (
          <>
            <button
              type="button"
              onClick={onMakeOwner}
              className="h-8 rounded-lg border border-border px-3 text-xs font-medium text-text-primary hover:bg-surface-hover"
            >
              {t('members.makeOwner')}
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="h-8 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              {t('members.remove')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
