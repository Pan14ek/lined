import { useState } from 'react';
import { HTTPError } from 'ky';
import { CalendarTopBar } from '@/components/CalendarTopBar';
import { CreateEventModal } from '@/components/CreateEventModal';
import { EventDetailPanel } from '@/components/EventDetailPanel';
import { DayAgendaPanel } from '@/components/DayAgendaPanel';
import { WeekGrid } from '@/components/WeekGrid';
import { MonthGrid } from '@/components/MonthGrid';
import { useWeekEvents, useMonthEvents, useDeleteEvent } from '@/hooks/useEvents';
import { useMyLobbies } from '@/hooks/useLobbies';
import { useCalendarStore } from '@/store/calendar';
import { useCreateMenuStore } from '@/store/createMenu';
import { formatMonthYear, hourRangeToIso, isSameDay, type FreeSlot } from '@/lib/calendarUtils';
import type { EventDto } from '@/types';

function getDeleteEventErrorMessage(error: unknown): string {
  if (error instanceof HTTPError && error.response.status === 404) {
    return 'This event was already deleted';
  }
  return 'Could not delete this event — please try again';
}

export function CalendarPage() {
  const {
    weekStart,
    monthAnchor,
    viewMode,
    selectedEventId,
    isCreateModalOpen,
    hiddenLobbyIds,
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
    toggleLobbyVisibility,
  } = useCalendarStore();

  const [editingEvent, setEditingEvent] = useState<EventDto | null>(null);
  const [agendaDay, setAgendaDay] = useState<Date | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: allWeekEvents = [] } = useWeekEvents(weekStart);
  const { data: allMonthEvents = [] } = useMonthEvents(monthAnchor);
  // Lobby-filter dropdown decluttering: same intent as Google/Outlook's
  // per-calendar checkboxes — hidden lobbies vanish from the grid entirely,
  // including free-slot detection (a hidden lobby's time isn't "free").
  const weekEvents = allWeekEvents.filter((e) => !hiddenLobbyIds.includes(e.lobbyId));
  const monthEvents = allMonthEvents.filter((e) => !hiddenLobbyIds.includes(e.lobbyId));
  const events = viewMode === 'month' ? monthEvents : weekEvents;
  const { data: lobbies = [] } = useMyLobbies();
  const deleteEvent = useDeleteEvent();
  const openReserveSlot = useCreateMenuStore((s) => s.openReserveSlot);

  function handleFreeSlotClick(day: Date, slot: FreeSlot) {
    const { start, end } = hourRangeToIso(day, slot.startHour, slot.endHour);
    openReserveSlot({ start, end });
  }

  function handleEventClick(id: number) {
    setAgendaDay(null);
    setDeleteError(null);
    setSelectedEventId(id);
  }

  function handleDayClick(day: Date) {
    setSelectedEventId(null);
    setAgendaDay(day);
  }

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
    setDeleteError(null);
    deleteEvent.mutate(selectedEventId, {
      onSuccess: () => setSelectedEventId(null),
      onError: (error) => setDeleteError(getDeleteEventErrorMessage(error)),
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
        lobbies={lobbies}
        hiddenLobbyIds={hiddenLobbyIds}
        onToggleLobby={toggleLobbyVisibility}
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
            onEventClick={handleEventClick}
            onFreeSlotClick={handleFreeSlotClick}
            onDayClick={handleDayClick}
            maxVisibleEvents={4}
          />
        )}

        {agendaDay && viewMode === 'week' ? (
          <DayAgendaPanel
            day={agendaDay}
            events={weekEvents.filter((e) => isSameDay(new Date(e.startAt), agendaDay))}
            lobbies={lobbies}
            selectedEventId={selectedEventId}
            onEventClick={handleEventClick}
            onClose={() => setAgendaDay(null)}
          />
        ) : (
          selectedEvent &&
          selectedLobby &&
          viewMode === 'week' && (
            <EventDetailPanel
              event={selectedEvent}
              lobby={selectedLobby}
              onClose={() => {
                setDeleteError(null);
                setSelectedEventId(null);
              }}
              onEdit={() => setEditingEvent(selectedEvent)}
              onDelete={handleDelete}
              deleteError={deleteError}
            />
          )
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
