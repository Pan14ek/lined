import { useEffect, useRef, useState } from 'react';
import type { EventDto, LobbyDto } from '@/types';
import {
  addDays,
  computeFreeSlots,
  formatDayLabel,
  formatHour,
  getEventHeight,
  getEventTop,
  GRID_END_HOUR,
  GRID_HOURS,
  GRID_START_HOUR,
  HOUR_HEIGHT,
  isSameDay,
  isToday,
} from '@/lib/calendarUtils';

// ─── Legend ──────────────────────────────────────────────────────────────────

const LEGEND_ITEMS = [
  { label: 'Couple', color: 'var(--color-lobby-couple)' },
  { label: 'Family', color: 'var(--color-lobby-family)' },
  { label: 'Friends', color: 'var(--color-lobby-friends)' },
  { label: 'Work', color: 'var(--color-lobby-work)' },
  { label: 'Free slot', color: '#B4EBD0' },
] as const;

function CalendarLegend() {
  return (
    <div className="flex flex-shrink-0 items-center gap-5 border-t border-border bg-white px-8 py-2">
      {LEGEND_ITEMS.map(({ label, color }) => (
        <div key={label} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          {label}
        </div>
      ))}
    </div>
  );
}

// ─── NowLine ─────────────────────────────────────────────────────────────────

function NowLine() {
  const [top, setTop] = useState<number | null>(null);

  useEffect(() => {
    function compute() {
      const now = new Date();
      const hours = now.getHours() + now.getMinutes() / 60;
      const t = (hours - GRID_START_HOUR) * HOUR_HEIGHT;
      setTop(t >= 0 && t <= (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT ? t : null);
    }
    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, []);

  if (top === null) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-10"
      style={{ top }}
    >
      <div className="relative h-0.5 bg-red-500">
        <div className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-red-500" />
      </div>
    </div>
  );
}

// ─── CalendarEvent ────────────────────────────────────────────────────────────

interface CalendarEventProps {
  event: EventDto;
  lobby?: LobbyDto;
  isSelected: boolean;
  onClick: () => void;
}

function CalendarEvent({ event, lobby, isSelected, onClick }: CalendarEventProps) {
  const top = getEventTop(event.startAt);
  const height = Math.max(getEventHeight(event.startAt, event.endAt), 24);
  const lobbyType = lobby?.lobbyType.toLowerCase() ?? 'couple';

  return (
    <button
      onClick={onClick}
      className="absolute left-[3px] right-[3px] overflow-hidden rounded-[6px] px-[6px] py-1 text-left text-white transition-opacity hover:opacity-100"
      style={{
        top,
        height,
        backgroundColor: `var(--color-lobby-${lobbyType})`,
        opacity: isSelected ? 1 : 0.92,
        outline: isSelected ? '2px solid white' : 'none',
        outlineOffset: '-2px',
      }}
    >
      <div className="text-[11px] font-semibold leading-tight truncate">{event.title}</div>
      {lobby && height > 36 && (
        <div className="text-[10px] leading-tight mt-0.5 truncate" style={{ opacity: 0.85 }}>
          {lobby.name}
        </div>
      )}
    </button>
  );
}

// ─── FreeSlotBand ─────────────────────────────────────────────────────────────

interface FreeSlotBandProps {
  startHour: number;
  endHour: number;
}

function FreeSlotBand({ startHour, endHour }: FreeSlotBandProps) {
  const top = (startHour - GRID_START_HOUR) * HOUR_HEIGHT;
  const height = (endHour - startHour) * HOUR_HEIGHT;

  return (
    <div
      className="pointer-events-none absolute left-[2px] right-[2px] rounded-[6px] flex items-center justify-center text-[10px] font-semibold text-brand-green-dark"
      style={{ top, height, backgroundColor: '#B4EBD0', opacity: 0.6 }}
    >
      {height >= 40 && 'Free slot'}
    </div>
  );
}

// ─── DayColumn ────────────────────────────────────────────────────────────────

interface DayColumnProps {
  day: Date;
  events: EventDto[];
  lobbyMap: Map<number, LobbyDto>;
  today: boolean;
  selectedEventId: number | null;
  onEventClick: (id: number) => void;
  showFreeSlots: boolean;
}

function DayColumn({
  day: _day,
  events,
  lobbyMap,
  today,
  selectedEventId,
  onEventClick,
  showFreeSlots,
}: DayColumnProps) {
  const freeSlots = showFreeSlots ? computeFreeSlots(events) : [];

  return (
    <div
      className={`relative flex-1 border-l border-border ${today ? 'bg-brand-green-light/25' : ''}`}
    >
      {/* Hour grid lines */}
      {GRID_HOURS.map((h) => (
        <div key={h} className="h-20 border-b border-border" />
      ))}

      {/* Free slot bands (behind events) */}
      {freeSlots.map((slot, i) => (
        <FreeSlotBand key={i} startHour={slot.startHour} endHour={slot.endHour} />
      ))}

      {/* Events */}
      {events.map((event) => (
        <CalendarEvent
          key={event.id}
          event={event}
          lobby={lobbyMap.get(event.lobbyId)}
          isSelected={event.id === selectedEventId}
          onClick={() => onEventClick(event.id)}
        />
      ))}

      {/* Current-time indicator */}
      {today && <NowLine />}
    </div>
  );
}

// ─── WeekGrid (public) ────────────────────────────────────────────────────────

interface WeekGridProps {
  weekStart: Date;
  events: EventDto[];
  lobbies: LobbyDto[];
  selectedEventId: number | null;
  onEventClick: (id: number) => void;
}

export function WeekGrid({
  weekStart,
  events,
  lobbies,
  selectedEventId,
  onEventClick,
}: WeekGridProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const lobbyMap = new Map(lobbies.map((l) => [l.id, l]));

  // Auto-scroll to current time on mount
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!gridRef.current) return;
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    const scrollTo = Math.max((hours - GRID_START_HOUR - 1) * HOUR_HEIGHT, 0);
    gridRef.current.scrollTop = scrollTo;
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      {/* Day header row */}
      <div className="flex flex-shrink-0 border-b border-border bg-white" style={{ paddingLeft: 56 }}>
        {weekDays.map((day) => {
          const today = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={`relative flex-1 py-2 text-center text-xs select-none ${
                today
                  ? 'bg-brand-green-light font-semibold text-brand-green-dark'
                  : 'text-text-secondary'
              }`}
            >
              {formatDayLabel(day)}
              {today && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-brand-green" />
              )}
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={gridRef} className="flex flex-1 overflow-y-auto bg-white">
        {/* Hour labels */}
        <div className="w-14 flex-shrink-0">
          {GRID_HOURS.map((h) => (
            <div
              key={h}
              className="flex h-20 items-start justify-end pr-2 pt-1 text-[11px] text-text-muted"
            >
              {formatHour(h)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex flex-1 min-w-0">
          {weekDays.map((day) => {
            const dayEvents = events.filter((e) =>
              isSameDay(new Date(e.startAt), day),
            );
            return (
              <DayColumn
                key={day.toISOString()}
                day={day}
                events={dayEvents}
                lobbyMap={lobbyMap}
                today={isToday(day)}
                selectedEventId={selectedEventId}
                onEventClick={onEventClick}
                showFreeSlots={dayEvents.length > 0}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <CalendarLegend />
    </div>
  );
}
