import { useEffect } from 'react';
import { useNavigate, useParams, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomTabBar } from './BottomTabBar';
import { CreateLobbyModal } from '@/features/lobby/CreateLobbyModal';
import { CreateEventModal } from '@/features/calendar/events/CreateEventModal';
import { TaskDrawer } from '@/features/tasks/TaskDrawer';
import { ReserveSlotModal } from '@/features/calendar/events/ReserveSlotModal';
import { useCreateMenuStore } from '@/store/createMenu';
import { useCalendarStore } from '@/store/calendar';
import { useUiStore } from '@/store/ui';
import { useMyLobbies } from '@/features/lobby/hooks/useLobbies';

export const AppShell = () => {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const lockedLobbyId = params.id ? Number(params.id) : undefined;
  const isCreateLobbyOpen = useCreateMenuStore((s) => s.isCreateLobbyOpen);
  const closeCreateLobby = useCreateMenuStore((s) => s.closeCreateLobby);
  const overlay = useCreateMenuStore((s) => s.overlay);
  const taskInitialStatus = useCreateMenuStore((s) => s.taskInitialStatus);
  const editingTask = useCreateMenuStore((s) => s.editingTask);
  const reserveSlotInitial = useCreateMenuStore((s) => s.reserveSlotInitial);
  const closeOverlay = useCreateMenuStore((s) => s.closeOverlay);
  const setSelectedEventId = useCalendarStore((s) => s.setSelectedEventId);
  const isSidebarDrawerOpen = useUiStore((s) => s.isSidebarDrawerOpen);
  const closeSidebarDrawer = useUiStore((s) => s.closeSidebarDrawer);
  const { data: lobbies = [] } = useMyLobbies();

  useEffect(() => {
    if (!isSidebarDrawerOpen) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarDrawerOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {isSidebarDrawerOpen && (
        <div data-testid="sidebar-drawer" className="fixed inset-0 z-40 flex lg:hidden">
          <div
            data-testid="sidebar-drawer-backdrop"
            className="absolute inset-0 bg-black/45"
            onClick={closeSidebarDrawer}
          />
          <div className="relative flex h-full">
            <Sidebar onNavigate={closeSidebarDrawer} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <TopBar />
        {/* overflow-hidden so full-height pages (e.g. CalendarPage) control their own scroll */}
        <main className="relative flex flex-1 flex-col overflow-hidden pb-16 md:pb-0">
          <Outlet />

          {isCreateLobbyOpen && <CreateLobbyModal onClose={closeCreateLobby} />}

          {overlay === 'event' && (
            <CreateEventModal
              lobbies={lobbies}
              onClose={closeOverlay}
              onCreated={() => {
                closeOverlay();
                navigate('/calendar');
              }}
            />
          )}

          {overlay === 'task' && (
            <TaskDrawer
              lobbies={lobbies}
              lockedLobbyId={editingTask ? editingTask.lobbyId : lockedLobbyId}
              initialStatus={taskInitialStatus ?? undefined}
              task={editingTask ?? undefined}
              onClose={closeOverlay}
            />
          )}

          {overlay === 'reserveSlot' && (
            <ReserveSlotModal
              lobbies={lobbies}
              initial={reserveSlotInitial}
              onClose={closeOverlay}
              onReserved={(event) => {
                closeOverlay();
                setSelectedEventId(event.id);
                navigate('/calendar');
              }}
            />
          )}
        </main>

        <BottomTabBar />
      </div>
    </div>
  );
}
