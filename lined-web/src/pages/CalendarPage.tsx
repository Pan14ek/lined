import { useState } from 'react';
import { CalendarTopBar } from '@/components/CalendarTopBar';
import { CreateEventModal } from '@/components/CreateEventModal';
import { EventDetailPanel } from '@/components/EventDetailPanel';
import { WeekGrid } from '@/components/WeekGrid';
import { MonthGrid } from '@/components/MonthGrid';
import { useWeekEvents, useMonthEvents, useDeleteEvent } from '@/hooks/useEvents';
import { useMyLobbies } from '@/hooks/useLobbies';
import { useCalendarStore } from '@/store/calendar';
import { formatMonthYear } from '@/lib/calendarUtils';
import type { EventDto } from '@/types';

export function CalendarPage() {
  const {
    weekStart,
    monthAnchor,
    viewMode,
    selectedEventId,
    isCreateModalOpen,
    goToPrevWeek,
    goToNextWeek,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    goToWeekOf,
    setViewMode,
    setSelectedEventId,
    openCreateModal,
    closeCreateModal,
  } = useCalendarStore();

  const [editingEvent, setEditingEvent] = useState<EventDto | null>(null);

  const { data: weekEvents = [] } = useWeekEvents(weekStart);
  const { data: monthEvents = [] } = useMonthEvents(monthAnchor);
  const events = viewMode === 'month' ? monthEvents : weekEvents;
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
        title={formatMonthYear(viewMode === 'month' ? monthAnchor : weekStart)}
        viewMode={viewMode}
        onPrev={viewMode === 'month' ? goToPrevMonth : goToPrevWeek}
        onNext={viewMode === 'month' ? goToNextMonth : goToNextWeek}
        onToday={goToToday}
        onViewModeChange={setViewMode}
        onNewEvent={openCreateModal}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {viewMode === 'month' ? (
          <MonthGrid
            monthAnchor={monthAnchor}
            events={monthEvents}
            lobbies={lobbies}
            onDayClick={goToWeekOf}
          />
        ) : (
          <WeekGrid
            weekStart={weekStart}
            events={weekEvents}
            lobbies={lobbies}
            selectedEventId={selectedEventId}
            onEventClick={setSelectedEventId}
          />
        )}

        {selectedEvent && selectedLobby && viewMode === 'week' && (
          <EventDetailPanel
            event={selectedEvent}
            lobby={selectedLobby}
            onClose={() => setSelectedEventId(null)}
            onEdit={() => setEditingEvent(selectedEvent)}
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

      {editingEvent && (
        <CreateEventModal
          lobbies={lobbies}
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSaved={() => setEditingEvent(null)}
        />
      )}
    </div>
  );
}
