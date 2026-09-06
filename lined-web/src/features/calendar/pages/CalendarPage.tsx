import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { getErrorStatus } from '@/lib/apiClient';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useQueryStall } from '@/hooks/useQueryStall';
import { ErrorState } from '@/components/patterns/ErrorState';
import { CalendarSkeleton } from '@/features/calendar/CalendarSkeleton';
import { CalendarTopBar } from '@/features/calendar/CalendarTopBar';
import { CreateEventModal } from '@/features/calendar/events/CreateEventModal';
import { EventDetailPanel } from '@/features/calendar/panels/EventDetailPanel';
import { DayAgendaPanel } from '@/features/calendar/panels/DayAgendaPanel';
import { WeekGrid } from '@/features/calendar/grid/WeekGrid';
import { MonthGrid } from '@/features/calendar/grid/MonthGrid';
import { DayChipStrip } from '@/features/calendar/grid/DayChipStrip';
import { useWeekEvents, useMonthEvents, useDeleteEvent } from '@/features/calendar/hooks/useEvents';
import { useMyLobbies } from '@/features/lobby/hooks/useLobbies';
import { useCalendarStore } from '@/store/calendar';
import { useCreateMenuStore } from '@/store/createMenu';
import {
  formatFullDate,
  formatMonthYear,
  getWeekStart,
  hourRangeToIso,
  isSameDay,
  eventTouchesDay,
  type FreeSlot,
} from '@/features/calendar/lib/calendarUtils';
import { WeekEmptyBanner } from '@/features/calendar/grid/WeekEmptyBanner';
import type { EventDto } from '@/features/calendar/model';

const getDeleteEventErrorMessage = (error: unknown, t: TFunction<'calendar'>): string => {
  if (getErrorStatus(error) === 404) {
    return t('page.deleteError.alreadyDeleted');
  }
  return t('page.deleteError.generic');
}

export const CalendarPage = () => {
  const { t } = useTranslation('calendar');
  const {
    weekStart,
    monthAnchor,
    viewMode,
    dayAnchor,
    selectedEventId,
    isCreateModalOpen,
    hiddenLobbyIds,
    goToPrevWeek,
    goToNextWeek,
    goToPrevMonth,
    goToNextMonth,
    goToPrevDay,
    goToNextDay,
    goToDay,
    goToToday,
    goToWeekOf,
    setViewMode,
    setSelectedEventId,
    openCreateModal,
    closeCreateModal,
    toggleLobbyVisibility,
  } = useCalendarStore();

  // Phones always show a single-day view (auto, not user-toggled) — the
  // week/month toggle in CalendarTopBar stays desktop/tablet-only.
  const isPhone = useMediaQuery('(max-width: 767px)');

  const [editingEvent, setEditingEvent] = useState<EventDto | null>(null);
  const [agendaDay, setAgendaDay] = useState<Date | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const dayWeekStart = getWeekStart(dayAnchor);
  const weekQuery = useWeekEvents(weekStart);
  const monthQuery = useMonthEvents(monthAnchor);
  const dayWeekQuery = useWeekEvents(dayWeekStart);
  const allWeekEvents = weekQuery.data ?? [];
  const allMonthEvents = monthQuery.data ?? [];
  const allDayWeekEvents = dayWeekQuery.data ?? [];
  // Lobby-filter dropdown decluttering: same intent as Google/Outlook's
  // per-calendar checkboxes — hidden lobbies vanish from the grid entirely,
  // including free-slot detection (a hidden lobby's time isn't "free").
  const weekEvents = allWeekEvents.filter((e) => !hiddenLobbyIds.includes(e.lobbyId));
  const monthEvents = allMonthEvents.filter((e) => !hiddenLobbyIds.includes(e.lobbyId));
  const dayEvents = allDayWeekEvents.filter(
    (e) => !hiddenLobbyIds.includes(e.lobbyId) && eventTouchesDay(e, dayAnchor),
  );
  const events = isPhone ? dayEvents : viewMode === 'month' ? monthEvents : weekEvents;
  const activeQuery = isPhone ? dayWeekQuery : viewMode === 'month' ? monthQuery : weekQuery;
  const isStalled = useQueryStall(activeQuery.isLoading);
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
          onError: (error) => setDeleteError(getDeleteEventErrorMessage(error, t)),
        });
      }

  return (
    // h-full fills the flex-1 main area; overflow-hidden so the grid controls its own scroll
    <div className="relative flex h-full flex-col overflow-hidden">
      {isPhone ? (
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4">
          <button
            type="button"
            onClick={goToPrevDay}
            aria-label={t('page.previousDay')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-bg"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="text-sm font-semibold text-text-primary"
          >
            {formatFullDate(dayAnchor)}
          </button>
          <button
            type="button"
            onClick={goToNextDay}
            aria-label={t('page.nextDay')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-bg"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
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
      )}

      {!isPhone &&
        viewMode === 'week' &&
        !activeQuery.isLoading &&
        !isStalled &&
        weekEvents.length === 0 && (
          <WeekEmptyBanner
            message={t('page.weekEmpty.message')}
            action={{ label: t('page.weekEmpty.action'), onClick: openCreateModal }}
          />
        )}

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
        {isPhone && <DayChipStrip selectedDay={dayAnchor} onSelectDay={goToDay} />}

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {isStalled || (!activeQuery.isLoading && activeQuery.isError) ? (
            <ErrorState
              className="flex-1"
              onRetry={() => void activeQuery.refetch()}
              title={t('page.loadError')}
            />
          ) : activeQuery.isLoading ? (
            <CalendarSkeleton dayCount={isPhone ? 1 : 7} testId="calendar-loading" />
          ) : isPhone ? (
            <WeekGrid
              weekStart={dayWeekStart}
              days={[dayAnchor]}
              events={dayEvents}
              lobbies={lobbies}
              selectedEventId={selectedEventId}
              onEventClick={handleEventClick}
              onFreeSlotClick={handleFreeSlotClick}
            />
          ) : viewMode === 'month' ? (
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

          {agendaDay && !isPhone && viewMode === 'week' ? (
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
            (isPhone || viewMode === 'week') && (
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
      </div>

      {isPhone && (
        <button
          type="button"
          onClick={openCreateModal}
          aria-label={t('page.newEvent')}
          className="fixed bottom-24 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-brand-green text-white shadow-[var(--shadow-lg)] hover:bg-brand-green-dark md:hidden"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

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
