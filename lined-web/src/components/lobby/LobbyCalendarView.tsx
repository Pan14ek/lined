import { useState } from 'react';
import { HTTPError } from 'ky';
import type { LobbyDto } from '@/types';
import { CalendarTopBar } from '@/components/CalendarTopBar';
import { CreateEventModal } from '@/components/CreateEventModal';
import { EventDetailPanel } from '@/components/EventDetailPanel';
import { WeekGrid, type LegendItem } from '@/components/WeekGrid';
import { DayAgendaModal } from '@/components/lobby/DayAgendaModal';
import { useLobbyWeekEvents, useDeleteEvent } from '@/hooks/useEvents';
import { useLobbyFreeSlots } from '@/hooks/useDashboard';
import {
  addDays,
  formatMonthYear,
  getWeekStart,
  isSameDay,
  hourRangeToIso,
  type FreeSlot,
} from '@/lib/calendarUtils';
import { freeSlotsForDay } from '@/lib/freeSlots';
import { lobbyAccentColor } from '@/lib/constants';
import { WeekEmptyBanner } from '@/components/calendar/WeekEmptyBanner';
import { useCreateMenuStore } from '@/store/createMenu';
import type { ViewMode } from '@/store/calendar';
import type { EventDto } from '@/types';

interface LobbyCalendarViewProps {
  lobby: LobbyDto;
}

function getDeleteEventErrorMessage(error: unknown): string {
  if (error instanceof HTTPError && error.response.status === 404) {
    return 'This event was already deleted';
  }
  return 'Could not delete this event — please try again';
}

export function LobbyCalendarView({ lobby }: LobbyCalendarViewProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventDto | null>(null);
  const [agendaDay, setAgendaDay] = useState<Date | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: events, isLoading, isError } = useLobbyWeekEvents(lobby.id, weekStart);
  const { data: freeSlots } = useLobbyFreeSlots(lobby.id, weekStart);
  const deleteEvent = useDeleteEvent();
  const openReserveSlot = useCreateMenuStore((s) => s.openReserveSlot);

  function handleFreeSlotClick(day: Date, slot: FreeSlot) {
    const { start, end } = hourRangeToIso(day, slot.startHour, slot.endHour);
    openReserveSlot({ lobbyId: lobby.id, start, end });
  }

  const selectedEvent =
    selectedEventId != null ? (events?.find((e) => e.id === selectedEventId) ?? null) : null;

  const legendItems: LegendItem[] = [
    { label: 'Shared event', color: lobbyAccentColor(lobby.lobbyType) },
    { label: 'Free slot (both available)', color: 'var(--color-free-slot)' },
  ];

  function handleDelete() {
    if (selectedEventId == null) return;
    setDeleteError(null);
    deleteEvent.mutate(selectedEventId, {
      onSuccess: () => setSelectedEventId(null),
      onError: (error) => setDeleteError(getDeleteEventErrorMessage(error)),
    });
  }

  return (
    <div className="relative flex h-[calc(100vh-160px)] flex-col overflow-hidden">
      <CalendarTopBar
        title={formatMonthYear(weekStart)}
        viewMode={viewMode}
        onPrev={() => setWeekStart((s) => addDays(s, -7))}
        onNext={() => setWeekStart((s) => addDays(s, 7))}
        onToday={() => setWeekStart(getWeekStart())}
        onViewModeChange={setViewMode}
        onNewEvent={() => setIsCreateModalOpen(true)}
      />

      {isLoading ? (
        <div className="flex-1 p-6" data-testid="lobby-calendar-loading">
          <div className="h-full animate-pulse rounded-xl bg-bg" />
        </div>
      ) : isError ? (
        <p className="p-6 text-sm text-text-secondary">
          Couldn&apos;t load the calendar. Try again later.
        </p>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          {(events ?? []).length === 0 && (
            <WeekEmptyBanner
              message="No events yet."
              action={{ label: 'Invite someone', to: `/lobbies/${lobby.id}?tab=members` }}
            />
          )}

          <div className="flex flex-1 min-h-0 overflow-hidden">
            <WeekGrid
              weekStart={weekStart}
              events={events ?? []}
              lobbies={[lobby]}
              selectedEventId={selectedEventId}
              onEventClick={(id) => {
                setDeleteError(null);
                setSelectedEventId(id);
              }}
              getFreeSlotsForDay={(day) => freeSlotsForDay(freeSlots ?? [], day)}
              legendItems={legendItems}
              onDayClick={(day) => setAgendaDay(day)}
              maxVisibleEvents={4}
              onFreeSlotClick={handleFreeSlotClick}
            />

            {selectedEvent && (
              <EventDetailPanel
                event={selectedEvent}
                lobby={lobby}
                onClose={() => {
                  setDeleteError(null);
                  setSelectedEventId(null);
                }}
                onEdit={() => setEditingEvent(selectedEvent)}
                onDelete={handleDelete}
                deleteError={deleteError}
              />
            )}
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <CreateEventModal
          lobbies={[lobby]}
          lockedLobbyId={lobby.id}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={(event) => {
            setIsCreateModalOpen(false);
            setSelectedEventId(event.id);
          }}
        />
      )}

      {editingEvent && (
        <CreateEventModal
          lobbies={[lobby]}
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSaved={() => setEditingEvent(null)}
        />
      )}

      {agendaDay && (
        <DayAgendaModal
          day={agendaDay}
          events={(events ?? []).filter((e) => isSameDay(new Date(e.startAt), agendaDay))}
          freeSlots={freeSlotsForDay(freeSlots ?? [], agendaDay)}
          lobby={lobby}
          selectedEventId={selectedEventId}
          onEventClick={(id) => {
            setAgendaDay(null);
            setSelectedEventId(id);
          }}
          onClose={() => setAgendaDay(null)}
        />
      )}
    </div>
  );
}
