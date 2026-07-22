import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu';
import { useMyNotifications, useMarkNotificationRead } from '@/features/notifications/hooks/useNotifications';
import { useMyLobbies } from '@/features/lobby/hooks/useLobbies';
import { useMyInvites, useAcceptInvite, useDeclineInvite } from '@/features/lobby/hooks/useInvites';
import { useCalendarStore } from '@/store/calendar';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { NotificationInbox } from './NotificationInbox';
import type { NotificationDto } from '@/features/notifications/model';

const MAX_BADGE_COUNT = 9;

const getInviteErrorMessage = (error: unknown, fallback: string): string => {
  return getApiErrorMessage(error, { 409: 'This invite is no longer valid' }, fallback);
}

export const NotificationBell = () => {
  const { t } = useTranslation('notifications');
  const navigate = useNavigate();
  const { data: notifications, isLoading, isError } = useMyNotifications();
  const { data: lobbies } = useMyLobbies();
  const { data: invites, refetch: refetchInvites } = useMyInvites();
  const markRead = useMarkNotificationRead();
  const acceptInvite = useAcceptInvite();
  const declineInvite = useDeclineInvite();
  const setSelectedEventId = useCalendarStore((s) => s.setSelectedEventId);
  const [inviteErrors, setInviteErrors] = useState<Record<number, string>>({});

  const unreadCount = notifications?.filter((n) => n.readAt == null).length ?? 0;
  const badgeLabel = unreadCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(unreadCount);

  const handleRowClick = (notification: NotificationDto) => {
    if (notification.readAt == null) markRead.mutate(notification.id);

    if (notification.taskId != null && notification.lobbyId != null) {
      navigate(`/lobbies/${notification.lobbyId}?tab=tasks`);
    } else if (notification.eventId != null) {
      setSelectedEventId(notification.eventId);
      navigate('/calendar');
    } else if (notification.lobbyId != null) {
      navigate(`/lobbies/${notification.lobbyId}`);
    }
  };

  const handleMarkAllRead = () => {
    notifications?.filter((n) => n.readAt == null).forEach((n) => markRead.mutate(n.id));
  };

  const handleAcceptInvite = (inviteId: number, lobbyId: number) => {
    setInviteErrors((prev) => ({ ...prev, [inviteId]: '' }));
    acceptInvite.mutate(inviteId, {
      onSuccess: () => navigate(`/lobbies/${lobbyId}`),
      onError: (error) => {
        setInviteErrors((prev) => ({
          ...prev,
          [inviteId]: getInviteErrorMessage(error, t('errors.acceptFailed')),
        }));
        void refetchInvites();
      },
    });
  };

  const handleDeclineInvite = (inviteId: number) => {
    setInviteErrors((prev) => ({ ...prev, [inviteId]: '' }));
    declineInvite.mutate(inviteId, {
      onError: (error) => {
        setInviteErrors((prev) => ({
          ...prev,
          [inviteId]: getInviteErrorMessage(error, t('errors.declineFailed')),
        }));
        void refetchInvites();
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('inbox.title')}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {badgeLabel}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <NotificationInbox
          notifications={notifications}
          lobbies={lobbies}
          isLoading={isLoading}
          isError={isError}
          onRowClick={handleRowClick}
          onMarkAllRead={handleMarkAllRead}
          invites={invites}
          onAcceptInvite={handleAcceptInvite}
          onDeclineInvite={handleDeclineInvite}
          acceptingInviteId={acceptInvite.isPending ? acceptInvite.variables : undefined}
          decliningInviteId={declineInvite.isPending ? declineInvite.variables : undefined}
          inviteErrors={inviteErrors}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
