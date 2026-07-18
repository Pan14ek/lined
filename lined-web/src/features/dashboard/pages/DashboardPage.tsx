import { useCurrentUser } from '@/features/users/hooks/useCurrentUser';
import { useMyLobbies } from '@/features/lobby/hooks/useLobbies';
import { useMyInvites } from '@/features/lobby/hooks/useInvites';
import { useUpcomingEvents } from '@/features/calendar/hooks/useEvents';
import { useMyTasks } from '@/features/tasks/hooks/useTasks';
import { useFreeSlotBanner } from '@/features/dashboard/hooks/useDashboard';
import { getGreeting, formatFullDate } from '@/features/calendar/lib/calendarUtils';
import { LobbyCardGrid } from '@/features/dashboard/lobbies/LobbyCardGrid';
import { DashboardHero } from '@/features/dashboard/DashboardHero';
import { UpcomingEventsList } from '@/features/dashboard/widgets/UpcomingEventsList';
import { MyTasksList } from '@/features/dashboard/widgets/MyTasksList';
import { FreeSlotBanner } from '@/features/dashboard/widgets/FreeSlotBanner';
import { CreateMenu } from '@/features/dashboard/CreateMenu';
import { NotificationBell } from '@/features/notifications/bell/NotificationBell';
import { PendingInvitesBanner } from '@/features/notifications/PendingInvitesBanner';
import { useCreateMenuStore } from '@/store/createMenu';

export const DashboardPage = () => {
  const { data: user } = useCurrentUser();
  const { data: lobbies, isLoading: lobbiesLoading, isError: lobbiesError } = useMyLobbies();
  const { data: invites, isLoading: invitesLoading, isError: invitesError } = useMyInvites();
  const { data: events, isLoading: eventsLoading, isError: eventsError } = useUpcomingEvents();
  const { data: tasks, isLoading: tasksLoading, isError: tasksError } = useMyTasks();
  const { slot, isLoading: slotLoading } = useFreeSlotBanner();
  const openReserveSlot = useCreateMenuStore((s) => s.openReserveSlot);

  const noLobbies = !lobbiesLoading && !lobbiesError && lobbies?.length === 0;
  const noInvites = !invitesLoading && !invitesError && (invites?.length ?? 0) === 0;
  const showHero = noLobbies && noInvites;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Greeting top bar */}
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-white px-4 md:px-8">
        <div>
          <h1 className="text-base font-semibold text-text-primary md:text-lg">
            {getGreeting()}, {user?.username ?? 'there'} 👋
          </h1>
          <p className="text-xs text-text-secondary">{formatFullDate(new Date())}</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <CreateMenu />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <PendingInvitesBanner />

        {showHero ? (
          <DashboardHero username={user?.username ?? 'there'} />
        ) : (
          <LobbyCardGrid
            lobbies={lobbies}
            upcomingEvents={events}
            myTasks={tasks}
            isLoading={lobbiesLoading}
            isError={lobbiesError}
          />
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <UpcomingEventsList
            events={events}
            lobbies={lobbies}
            isLoading={eventsLoading}
            isError={eventsError}
          />

          <div>
            <MyTasksList tasks={tasks} isLoading={tasksLoading} isError={tasksError} />
            <FreeSlotBanner
              slot={slot}
              isLoading={slotLoading}
              onPlan={(s) => openReserveSlot({ lobbyId: s.lobbyId, start: s.start, end: s.end })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
