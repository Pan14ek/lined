import { useNavigate, useParams, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CreateLobbyModal } from './CreateLobbyModal';
import { CreateEventModal } from './CreateEventModal';
import { TaskDrawer } from './TaskDrawer';
import { ReserveSlotModal } from './ReserveSlotModal';
import { useCreateMenuStore } from '@/store/createMenu';
import { useCalendarStore } from '@/store/calendar';
import { useMyLobbies } from '@/hooks/useLobbies';

export function AppShell() {
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
  const { data: lobbies = [] } = useMyLobbies();

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar />
        {/* overflow-hidden so full-height pages (e.g. CalendarPage) control their own scroll */}
        <main className="relative flex flex-1 flex-col overflow-hidden">
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
      </div>
    </div>
  );
}
