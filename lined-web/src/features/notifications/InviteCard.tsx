import { useTranslation } from 'react-i18next';
import type { LobbyInviteDto } from '@/features/lobby/model';
import { useUser } from '@/features/users/hooks/useUsers';
import { useLobby } from '@/features/lobby/hooks/useLobbies';
import { LOBBY_TYPE_ICONS, LOBBY_TYPE_LABELS, lobbyAccentColor } from '@/features/lobby/lib/constants';
import { formatRelativeTimeAgo } from '@/features/calendar/lib/calendarUtils';

interface InviteCardProps {
  invite: LobbyInviteDto;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting: boolean;
  isDeclining: boolean;
  error?: string;
}

export const InviteCard = ({
  invite,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining,
  error,
}: InviteCardProps) => {
  const { t } = useTranslation('notifications');
  const { data: inviter } = useUser(invite.inviterId);
  const { data: lobby, isError: lobbyError } = useLobby(invite.lobbyId);
  const isPending = isAccepting || isDeclining;

  const inviterName = inviter?.username ?? t('inviteCard.fallbackInviter', { id: invite.inviterId });
  const lobbyName = lobby?.name ?? t('inviteCard.fallbackLobbyName');
  const avatarColor = lobby ? lobbyAccentColor(lobby.lobbyType) : undefined;
  const subLine = lobby
    ? t('inviteCard.subLine', {
        icon: LOBBY_TYPE_ICONS[lobby.lobbyType],
        label: LOBBY_TYPE_LABELS[lobby.lobbyType],
        count: lobby.memberIds.length,
        time: formatRelativeTimeAgo(invite.sentAt),
      })
    : lobbyError
      ? t('inviteCard.subLineNoLobby', { time: formatRelativeTimeAgo(invite.sentAt) })
      : t('inviteCard.loadingLobbyDetails');

  return (
    <div
      data-testid="invite-card"
      className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border-[1.5px] border-brand-green bg-surface p-3.5 shadow-[var(--shadow-sm)]"
    >
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
        style={{ backgroundColor: avatarColor ?? 'var(--color-text-muted)' }}
      >
        {inviterName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-[170px] flex-1">
        <p className="text-sm font-semibold text-text-primary">
          {t('inviteCard.invitedYouTo', { inviter: inviterName })} <strong>{lobbyName}</strong>
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">{subLine}</p>
        {error && <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
      <div className="ml-auto flex flex-shrink-0 gap-2">
        <button
          type="button"
          onClick={onAccept}
          disabled={isPending}
          className="h-8 rounded-lg bg-brand-green px-3.5 text-xs font-semibold text-white hover:bg-brand-green-dark disabled:opacity-60"
        >
          {isAccepting ? t('inviteCard.accepting') : t('inviteCard.accept')}
        </button>
        <button
          type="button"
          onClick={onDecline}
          disabled={isPending}
          className="h-8 rounded-lg border border-red-300 px-3.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-800/60 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          {isDeclining ? t('inviteCard.declining') : t('inviteCard.decline')}
        </button>
      </div>
    </div>
  );
};
