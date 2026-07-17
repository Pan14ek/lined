import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMyLobbies } from '@/hooks/useLobbies';
import { useUpcomingEvents } from '@/hooks/useEvents';
import { useMyTasks } from '@/hooks/useTasks';
import { useFreeSlotBanner } from '@/hooks/useDashboard';
import { getGreeting, formatFullDate } from '@/lib/calendarUtils';
import { LobbyCardGrid } from '@/components/dashboard/LobbyCardGrid';
import { UpcomingEventsList } from '@/components/dashboard/UpcomingEventsList';
import { MyTasksList } from '@/components/dashboard/MyTasksList';
import { FreeSlotBanner } from '@/components/dashboard/FreeSlotBanner';
import { CreateMenu } from '@/components/CreateMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { PendingInvitesBanner } from '@/components/PendingInvitesBanner';
import { useCreateMenuStore } from '@/store/createMenu';

export function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: lobbies, isLoading: lobbiesLoading, isError: lobbiesError } = useMyLobbies();
  const { data: events, isLoading: eventsLoading, isError: eventsError } = useUpcomingEvents();
  const { data: tasks, isLoading: tasksLoading, isError: tasksError } = useMyTasks();
  const { slot, isLoading: slotLoading } = useFreeSlotBanner();
  const openReserveSlot = useCreateMenuStore((s) => s.openReserveSlot);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Greeting top bar */}
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-white px-8">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">
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
      <div className="flex flex-col gap-6 p-6">
        <PendingInvitesBanner />

        <LobbyCardGrid
          lobbies={lobbies}
          upcomingEvents={events}
          myTasks={tasks}
          isLoading={lobbiesLoading}
          isError={lobbiesError}
        />

        <div className="grid grid-cols-2 gap-6">
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
