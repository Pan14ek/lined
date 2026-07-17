import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu';
import { useMyNotifications, useMarkNotificationRead } from '@/hooks/useNotifications';
import { useMyLobbies } from '@/hooks/useLobbies';
import { useCalendarStore } from '@/store/calendar';
import { NotificationInbox } from './NotificationInbox';
import type { NotificationDto } from '@/types';

const MAX_BADGE_COUNT = 9;

export const NotificationBell = () => {
  const navigate = useNavigate();
  const { data: notifications, isLoading, isError } = useMyNotifications();
  const { data: lobbies } = useMyLobbies();
  const markRead = useMarkNotificationRead();
  const setSelectedEventId = useCalendarStore((s) => s.setSelectedEventId);

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-gray-100"
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
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
