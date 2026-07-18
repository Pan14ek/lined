import { useState } from 'react';
import { getErrorStatus } from '@/lib/apiClient';
import type { LobbyDto } from '@/features/lobby/model';
import { CalendarTopBar } from '@/features/calendar/CalendarTopBar';
import { CreateEventModal } from '@/features/calendar/events/CreateEventModal';
import { EventDetailPanel } from '@/features/calendar/panels/EventDetailPanel';
import { WeekGrid, type LegendItem } from '@/features/calendar/grid/WeekGrid';
import { DayAgendaModal } from './DayAgendaModal';
import { useLobbyWeekEvents, useDeleteEvent } from '@/features/calendar/hooks/useEvents';
import { useLobbyFreeSlots } from '@/features/dashboard/hooks/useDashboard';
import {
  addDays,
  formatMonthYear,
  getWeekStart,
  isSameDay,
  hourRangeToIso,
  type FreeSlot,
} from '@/features/calendar/lib/calendarUtils';
import { freeSlotsForDay } from '@/features/calendar/lib/freeSlots';
import { lobbyAccentColor } from '@/features/lobby/lib/constants';
import { WeekEmptyBanner } from '@/features/calendar/grid/WeekEmptyBanner';
import { useCreateMenuStore } from '@/store/createMenu';
import type { ViewMode } from '@/store/calendar';
import type { EventDto } from '@/features/calendar/model';

interface LobbyCalendarViewProps {
  lobby: LobbyDto;
}

const getDeleteEventErrorMessage = (error: unknown): string => {
  if (getErrorStatus(error) === 404) {
    return 'This event was already deleted';
  }
  return 'Could not delete this event — please try again';
}

export const LobbyCalendarView = ({ lobby }: LobbyCalendarViewProps) => {
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

  const handleFreeSlotClick = (day: Date, slot: FreeSlot) => {
        const { start, end } = hourRangeToIso(day, slot.startHour, slot.endHour);
        openReserveSlot({ lobbyId: lobby.id, start, end });
      }

  const selectedEvent =
    selectedEventId != null ? (events?.find((e) => e.id === selectedEventId) ?? null) : null;

  const legendItems: LegendItem[] = [
    { label: 'Shared event', color: lobbyAccentColor(lobby.lobbyType) },
    { label: 'Free slot (both available)', color: 'var(--color-free-slot)' },
  ];

  const handleDelete = () => {
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
