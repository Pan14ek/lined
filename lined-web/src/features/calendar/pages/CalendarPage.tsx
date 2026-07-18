import { useState } from 'react';
import { getErrorStatus } from '@/lib/apiClient';
import { CalendarTopBar } from '@/features/calendar/CalendarTopBar';
import { CreateEventModal } from '@/features/calendar/events/CreateEventModal';
import { EventDetailPanel } from '@/features/calendar/panels/EventDetailPanel';
import { DayAgendaPanel } from '@/features/calendar/panels/DayAgendaPanel';
import { WeekGrid } from '@/features/calendar/grid/WeekGrid';
import { MonthGrid } from '@/features/calendar/grid/MonthGrid';
import { useWeekEvents, useMonthEvents, useDeleteEvent } from '@/features/calendar/hooks/useEvents';
import { useMyLobbies } from '@/features/lobby/hooks/useLobbies';
import { useCalendarStore } from '@/store/calendar';
import { useCreateMenuStore } from '@/store/createMenu';
import { formatMonthYear, hourRangeToIso, isSameDay, type FreeSlot } from '@/features/calendar/lib/calendarUtils';
import { WeekEmptyBanner } from '@/features/calendar/grid/WeekEmptyBanner';
import type { EventDto } from '@/features/calendar/model';

const getDeleteEventErrorMessage = (error: unknown): string => {
  if (getErrorStatus(error) === 404) {
    return 'This event was already deleted';
  }
  return 'Could not delete this event — please try again';
}

export const CalendarPage = () => {
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

  const handleFreeSlotClick = (day: Date, slot: FreeSlot) => {
        const { start, end } = hourRangeToIso(day, slot.startHour, slot.endHour);
        openReserveSlot({ start, end });
      }

  const handleEventClick = (id: number) => {
        setAgendaDay(null);
        setDeleteError(null);
        setSelectedEventId(id);
      }

  const handleDayClick = (day: Date) => {
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

  const handleDelete = () => {
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

      {viewMode === 'week' && weekEvents.length === 0 && (
        <WeekEmptyBanner
          message="No events this week — create one."
          action={{ label: 'Create event', onClick: openCreateModal }}
        />
      )}

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
