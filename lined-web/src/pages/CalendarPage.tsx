import { CalendarTopBar } from '@/components/CalendarTopBar';
import { CreateEventModal } from '@/components/CreateEventModal';
import { EventDetailPanel } from '@/components/EventDetailPanel';
import { WeekGrid } from '@/components/WeekGrid';
import { useWeekEvents, useDeleteEvent } from '@/hooks/useEvents';
import { useMyLobbies } from '@/hooks/useLobbies';
import { useCalendarStore } from '@/store/calendar';

export function CalendarPage() {
  const {
    weekStart,
    viewMode,
    selectedEventId,
    isCreateModalOpen,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
    setViewMode,
    setSelectedEventId,
    openCreateModal,
    closeCreateModal,
  } = useCalendarStore();

  const { data: events = [] } = useWeekEvents(weekStart);
  const { data: lobbies = [] } = useMyLobbies();
  const deleteEvent = useDeleteEvent();

  const lobbyMap = new Map(lobbies.map((l) => [l.id, l]));
  const selectedEvent =
    selectedEventId != null
      ? (events.find((e) => e.id === selectedEventId) ?? null)
      : null;
  const selectedLobby = selectedEvent
    ? (lobbyMap.get(selectedEvent.lobbyId) ?? null)
    : null;

  function handleDelete() {
    if (selectedEventId == null) return;
    deleteEvent.mutate(selectedEventId, {
      onSuccess: () => setSelectedEventId(null),
    });
  }

  return (
    // h-full fills the flex-1 main area; overflow-hidden so the grid controls its own scroll
    <div className="relative flex h-full flex-col overflow-hidden">
      <CalendarTopBar
        weekStart={weekStart}
        viewMode={viewMode}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
        onToday={goToToday}
        onViewModeChange={setViewMode}
        onNewEvent={openCreateModal}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <WeekGrid
          weekStart={weekStart}
          events={events}
          lobbies={lobbies}
          selectedEventId={selectedEventId}
          onEventClick={setSelectedEventId}
        />

        {selectedEvent && selectedLobby && (
          <EventDetailPanel
            event={selectedEvent}
            lobby={selectedLobby}
            onClose={() => setSelectedEventId(null)}
            onEdit={() => {
              /* TODO: open edit modal */
            }}
            onDelete={handleDelete}
          />
        )}
      </div>

      {isCreateModalOpen && (
        <CreateEventModal
          lobbies={lobbies}
          onClose={closeCreateModal}
          onCreated={(event) => {
            closeCreateModal();
            setSelectedEventId(event.id);
          }}
        />
      )}
    </div>
  );
}
