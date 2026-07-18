import { CheckCircle2, CalendarPlus, Bell as BellIcon } from 'lucide-react';
import type { LobbyDto, LobbyInviteDto } from '@/features/lobby/model';
import type { NotificationDto, NotificationType } from '@/features/notifications/model';
import { formatRelativeTimeAgo } from '@/features/calendar/lib/calendarUtils';
import { cn } from '@/lib/utils';
import { InviteCard } from '../InviteCard';

const TYPE_ICONS: Record<NotificationType, typeof CheckCircle2> = {
  TASK_ASSIGNED: CheckCircle2,
  SHARED_EVENT_CREATED: CalendarPlus,
};

interface NotificationInboxProps {
  notifications: NotificationDto[] | undefined;
  lobbies: LobbyDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRowClick: (notification: NotificationDto) => void;
  onMarkAllRead: () => void;
  invites: LobbyInviteDto[] | undefined;
  onAcceptInvite: (inviteId: number, lobbyId: number) => void;
  onDeclineInvite: (inviteId: number) => void;
  acceptingInviteId: number | undefined;
  decliningInviteId: number | undefined;
  inviteErrors: Record<number, string>;
}

export const NotificationInbox = ({
  notifications,
  lobbies,
  isLoading,
  isError,
  onRowClick,
  onMarkAllRead,
  invites,
  onAcceptInvite,
  onDeclineInvite,
  acceptingInviteId,
  decliningInviteId,
  inviteErrors,
}: NotificationInboxProps) => {
  const lobbyMap = new Map((lobbies ?? []).map((l) => [l.id, l]));
  const hasUnread = notifications?.some((n) => n.readAt == null) ?? false;

  return (
    <div className="flex max-h-96 w-80 flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-semibold text-text-primary">Notifications</span>
        {hasUnread && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-xs font-medium text-brand-green hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {invites != null && invites.length > 0 && (
          <div className="border-b border-border p-2">
            {invites.map((invite) => (
              <InviteCard
                key={invite.id}
                invite={invite}
                onAccept={() => onAcceptInvite(invite.id, invite.lobbyId)}
                onDecline={() => onDeclineInvite(invite.id)}
                isAccepting={acceptingInviteId === invite.id}
                isDeclining={decliningInviteId === invite.id}
                error={inviteErrors[invite.id] || undefined}
              />
            ))}
          </div>
        )}

        {isLoading && (
          <div className="space-y-2 p-3" data-testid="notification-inbox-loading">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-bg" />
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <p className="p-3 text-sm text-text-secondary">Couldn&apos;t load notifications.</p>
        )}

        {!isLoading && !isError && notifications?.length === 0 && (
          <p className="p-3 text-sm text-text-secondary">You&apos;re all caught up.</p>
        )}

        {!isLoading && !isError && notifications != null && notifications.length > 0 && (
          <ul>
            {notifications.map((notification) => {
              const Icon = TYPE_ICONS[notification.type] ?? BellIcon;
              const isUnread = notification.readAt == null;
              const lobbyName =
                notification.lobbyId != null
                  ? lobbyMap.get(notification.lobbyId)?.name
                  : undefined;

              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => onRowClick(notification)}
                    className={cn(
                      'flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-surface-hover',
                      isUnread && 'bg-brand-green-light/40',
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-secondary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary">{notification.message}</p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {formatRelativeTimeAgo(notification.createdAt)}
                        {lobbyName ? ` · ${lobbyName}` : ''}
                      </p>
                    </div>
                    {isUnread && (
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-green" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
