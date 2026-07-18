import { useEffect, useRef, useState } from 'react';
import type { EventDto } from '@/features/calendar/model';
import type { LobbyDto } from '@/features/lobby/model';
import {
  addDays,
  assignEventLanes,
  clipEventToDay,
  computeFreeSlots,
  eventTouchesDay,
  formatDayLabel,
  formatHour,
  getEventHeight,
  getEventTop,
  GRID_END_HOUR,
  GRID_HOURS,
  GRID_START_HOUR,
  HOUR_HEIGHT,
  isToday,
  type EventLane,
  type FreeSlot,
} from '@/features/calendar/lib/calendarUtils';
import { CalendarLegend } from './CalendarLegend';
import { DEFAULT_LEGEND_ITEMS, type LegendItem } from '@/features/calendar/lib/constants';
import { lobbyAccentColor } from '@/features/lobby/lib/constants';

export type { LegendItem };

// ─── NowLine ─────────────────────────────────────────────────────────────────

const NowLine = () => {
      const [top, setTop] = useState<number | null>(null);

      useEffect(() => {
        const compute = () => {
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
  /** This day's slice of the event's start/end — differs from event.startAt/endAt
   *  when the event spans midnight, so it renders as two clipped segments. */
  displayStartAt: string;
  displayEndAt: string;
  lobby?: LobbyDto;
  isSelected: boolean;
  onClick: () => void;
  lane?: number;
  laneCount?: number;
}

const CalendarEvent = ({
  event,
  displayStartAt,
  displayEndAt,
  lobby,
  isSelected,
  onClick,
  lane,
  laneCount,
}: CalendarEventProps) => {
  const top = getEventTop(displayStartAt);
  const height = Math.max(getEventHeight(displayStartAt, displayEndAt), 24);
  const accentColor = lobby ? lobbyAccentColor(lobby.lobbyType) : 'var(--color-lobby-couple)';

  const horizontal: React.CSSProperties =
    laneCount != null && laneCount > 1
      ? {
          left: `calc(${((lane ?? 0) / laneCount) * 100}% + 2px)`,
          width: `calc(${100 / laneCount}% - 4px)`,
        }
      : { left: 3, right: 3 };

  return (
    <button
      onClick={onClick}
      className="absolute overflow-hidden rounded-[6px] px-[6px] py-1 text-left text-white transition-opacity hover:opacity-100"
      style={{
        top,
        height,
        ...horizontal,
        backgroundColor: accentColor,
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
  onClick?: () => void;
}

const FreeSlotBand = ({ startHour, endHour, onClick }: FreeSlotBandProps) => {
  const top = (startHour - GRID_START_HOUR) * HOUR_HEIGHT;
  const height = (endHour - startHour) * HOUR_HEIGHT;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Reserve this free slot"
        className="absolute left-[2px] right-[2px] flex cursor-pointer items-center justify-center rounded-[6px] text-[10px] font-semibold text-brand-green-dark dark:text-brand-green hover:opacity-80"
        style={{ top, height, backgroundColor: 'var(--color-free-slot)', opacity: 0.6 }}
      >
        {height >= 40 && 'Free slot'}
      </button>
    );
  }

  return (
    <div
      className="pointer-events-none absolute left-[2px] right-[2px] rounded-[6px] flex items-center justify-center text-[10px] font-semibold text-brand-green-dark dark:text-brand-green"
      style={{ top, height, backgroundColor: 'var(--color-free-slot)', opacity: 0.6 }}
    >
      {height >= 40 && 'Free slot'}
    </div>
  );
}

// ─── DayColumn ────────────────────────────────────────────────────────────────

interface DayColumnActions {
  onEventClick: (id: number) => void;
  onFreeSlotClick?: (slot: FreeSlot) => void;
  onShowMore?: () => void;
}

interface DayColumnProps {
  day: Date;
  events: EventDto[];
  lobbyMap: Map<number, LobbyDto>;
  today: boolean;
  selectedEventId: number | null;
  freeSlots: FreeSlot[];
  lanes?: Map<number, EventLane>;
  overflowCount?: number;
  actions: DayColumnActions;
}

const DayColumn = ({
  day,
  events,
  lobbyMap,
  today,
  selectedEventId,
  freeSlots,
  lanes,
  overflowCount = 0,
  actions,
}: DayColumnProps) => {
  return (
    <div
      className={`relative flex-1 border-l border-border ${today ? 'bg-brand-green-light/25' : ''}`}
    >
      {/* Hour grid lines — a single tiled background instead of GRID_HOURS.length
          separately-bordered divs, so every line renders identically regardless
          of scroll position or fractional column widths. */}
      <div
        className="pointer-events-none"
        style={{
          height: GRID_HOURS.length * HOUR_HEIGHT,
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_HEIGHT - 1}px, var(--color-border) ${HOUR_HEIGHT - 1}px, var(--color-border) ${HOUR_HEIGHT}px)`,
        }}
      />

      {/* Free slot bands (behind events) */}
      {freeSlots.map((slot, i) => (
        <FreeSlotBand
          key={i}
          startHour={slot.startHour}
          endHour={slot.endHour}
          onClick={actions.onFreeSlotClick ? () => actions.onFreeSlotClick!(slot) : undefined}
        />
      ))}

      {/* Events */}
      {events.map((event) => {
        const laneInfo = lanes?.get(event.id);
        const { startAt: displayStartAt, endAt: displayEndAt } = clipEventToDay(event, day);
        return (
          <CalendarEvent
            key={event.id}
            event={event}
            displayStartAt={displayStartAt}
            displayEndAt={displayEndAt}
            lobby={lobbyMap.get(event.lobbyId)}
            isSelected={event.id === selectedEventId}
            onClick={() => actions.onEventClick(event.id)}
            lane={laneInfo?.lane}
            laneCount={laneInfo?.laneCount}
          />
        );
      })}

      {/* Overflow pill — opens the day agenda view for the remaining events */}
      {overflowCount > 0 && actions.onShowMore && (
        <button
          type="button"
          onClick={actions.onShowMore}
          className="absolute right-1 top-1 z-20 rounded-full bg-text-primary/80 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-text-primary"
        >
          +{overflowCount} more
        </button>
      )}

      {/* Current-time indicator */}
      {today && <NowLine />}
    </div>
  );
}

// ─── WeekGrid (public) ────────────────────────────────────────────────────────

interface WeekGridProps {
  weekStart: Date;
  /** Overrides the default 7-day week — a 1-length array renders the same
   *  hour-grid/free-slot/event internals as a single day column (phone day view). */
  days?: Date[];
  events: EventDto[];
  lobbies: LobbyDto[];
  selectedEventId: number | null;
  onEventClick: (id: number) => void;
  /** Overrides the default (client-computed) free-slot bands for a day. */
  getFreeSlotsForDay?: (day: Date, dayEvents: EventDto[]) => FreeSlot[];
  /** Overrides the default 5-item legend. */
  legendItems?: LegendItem[];
  /**
   * Opt-in: when provided, day headers become clickable, overlapping events
   * are laid out side-by-side, and days with more than `maxVisibleEvents`
   * events show a "+N more" pill — all calling back with the day and its
   * full event list. Omitted by the global calendar to keep it unchanged.
   */
  onDayClick?: (day: Date, dayEvents: EventDto[]) => void;
  /** Only used when `onDayClick` is provided. Defaults to 4. */
  maxVisibleEvents?: number;
  /** Opt-in: makes green free-slot bands clickable, e.g. to open ReserveSlotModal. */
  onFreeSlotClick?: (day: Date, slot: FreeSlot) => void;
}

const defaultGetFreeSlotsForDay = (day: Date, dayEvents: EventDto[]): FreeSlot[] =>
  dayEvents.length > 0 ? computeFreeSlots(dayEvents, day) : [];

export const WeekGrid = ({
  weekStart,
  days,
  events,
  lobbies,
  selectedEventId,
  onEventClick,
  getFreeSlotsForDay = defaultGetFreeSlotsForDay,
  legendItems = DEFAULT_LEGEND_ITEMS,
  onDayClick,
  maxVisibleEvents = 4,
  onFreeSlotClick,
}: WeekGridProps) => {
  const weekDays = days ?? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
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
    <div className="flex flex-1 flex-col overflow-hidden bg-surface">
      {/* Day header row */}
      <div className="flex flex-shrink-0 border-b border-border bg-surface" style={{ paddingLeft: 56 }}>
        {weekDays.map((day) => {
          const today = isToday(day);
          const dayEvents = events.filter((e) => eventTouchesDay(e, day));
          return (
            <div
              key={day.toISOString()}
              role={onDayClick ? 'button' : undefined}
              tabIndex={onDayClick ? 0 : undefined}
              onClick={onDayClick ? () => onDayClick(day, dayEvents) : undefined}
              onKeyDown={
                onDayClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') onDayClick(day, dayEvents);
                    }
                  : undefined
              }
              className={`relative flex-1 py-2 text-center text-xs select-none ${
                today
                  ? 'bg-brand-green-light font-semibold text-brand-green-dark dark:text-brand-green'
                  : 'text-text-secondary'
              } ${onDayClick ? 'cursor-pointer hover:bg-surface-hover' : ''}`}
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
      <div ref={gridRef} className="flex flex-1 overflow-y-auto bg-surface">
        {/* Hour labels. self-start: without it, the flex row's default
            align-items:stretch sizes this box to the scroll container's
            *viewport* height rather than its own (taller) content, which
            would anchor the absolutely-positioned "12 AM" label below to
            the wrong, visually-clipped spot. */}
        <div className="relative w-14 flex-shrink-0 self-start">
          {GRID_HOURS.map((h) => (
            <div
              key={h}
              className="flex h-20 items-start justify-end pr-2 pt-1 text-[11px] text-text-muted"
            >
              {formatHour(h)}
            </div>
          ))}
          {/* Closing boundary label for the last row — absolutely positioned so
              it doesn't add flow height (would desync from the day columns). */}
          <div className="absolute bottom-0 right-2 text-[11px] text-text-muted">12 AM</div>
        </div>

        {/* Day columns */}
        <div className="flex flex-1 min-w-0">
          {weekDays.map((day) => {
            const dayEvents = events.filter((e) => eventTouchesDay(e, day));
            const freeSlots = getFreeSlotsForDay(day, dayEvents);

            if (!onDayClick) {
              return (
                <DayColumn
                  key={day.toISOString()}
                  day={day}
                  events={dayEvents}
                  lobbyMap={lobbyMap}
                  today={isToday(day)}
                  selectedEventId={selectedEventId}
                  freeSlots={freeSlots}
                  actions={{
                    onEventClick,
                    onFreeSlotClick: onFreeSlotClick
                      ? (slot) => onFreeSlotClick(day, slot)
                      : undefined,
                  }}
                />
              );
            }

            const sorted = [...dayEvents].sort((a, b) => a.startAt.localeCompare(b.startAt));
            const visible = sorted.slice(0, maxVisibleEvents);
            const overflowCount = dayEvents.length - visible.length;
            const lanes = assignEventLanes(visible);

            return (
              <DayColumn
                key={day.toISOString()}
                day={day}
                events={visible}
                lobbyMap={lobbyMap}
                today={isToday(day)}
                selectedEventId={selectedEventId}
                freeSlots={freeSlots}
                lanes={lanes}
                overflowCount={overflowCount}
                actions={{
                  onEventClick,
                  onFreeSlotClick: onFreeSlotClick
                    ? (slot) => onFreeSlotClick(day, slot)
                    : undefined,
                  onShowMore: () => onDayClick(day, dayEvents),
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <CalendarLegend items={legendItems} />
    </div>
  );
}
