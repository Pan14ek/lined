import type { EventDto } from '@/features/calendar/model';
import type { LobbyDto } from '@/features/lobby/model';
import { CalendarLegend } from './CalendarLegend';
import { getMonthGridDays, isSameDay, isSameMonth, isToday } from '@/features/calendar/lib/calendarUtils';
import { lobbyAccentColor } from '@/features/lobby/lib/constants';

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_VISIBLE_CHIPS = 3;

interface MonthDayCellProps {
  day: Date;
  monthAnchor: Date;
  events: EventDto[];
  lobbyMap: Map<number, LobbyDto>;
  onDayClick: (day: Date) => void;
}

const MonthDayCell = ({ day, monthAnchor, events, lobbyMap, onDayClick }: MonthDayCellProps) => {
  const inCurrentMonth = isSameMonth(day, monthAnchor);
  const today = isToday(day);
  const sorted = [...events].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const visible = sorted.slice(0, MAX_VISIBLE_CHIPS);
  const overflowCount = sorted.length - visible.length;

  return (
    <button
      type="button"
      onClick={() => onDayClick(day)}
      className={`flex min-h-0 flex-col items-start gap-1 overflow-hidden border-b border-l border-border p-1.5 text-left ${
        inCurrentMonth ? 'bg-white' : 'bg-gray-50'
      } hover:bg-gray-50`}
    >
      <div
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] ${
          today
            ? 'bg-brand-green font-semibold text-white'
            : inCurrentMonth
              ? 'text-text-primary'
              : 'text-text-muted'
        }`}
      >
        {day.getDate()}
      </div>
      <div className="flex w-full flex-col gap-0.5">
        {visible.map((event) => {
          const lobby = lobbyMap.get(event.lobbyId);
          const accentColor = lobby ? lobbyAccentColor(lobby.lobbyType) : 'var(--color-lobby-couple)';
          return (
            <span
              key={event.id}
              className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: accentColor }}
            >
              {event.title}
            </span>
          );
        })}
        {overflowCount > 0 && (
          <span className="px-1.5 text-[10px] font-medium text-text-muted">
            +{overflowCount} more
          </span>
        )}
      </div>
    </button>
  );
}

interface MonthGridProps {
  monthAnchor: Date;
  events: EventDto[];
  lobbies: LobbyDto[];
  onDayClick: (day: Date) => void;
}

export const MonthGrid = ({ monthAnchor, events, lobbies, onDayClick }: MonthGridProps) => {
  const gridDays = getMonthGridDays(monthAnchor);
  const lobbyMap = new Map(lobbies.map((l) => [l.id, l]));

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      {/* Day-of-week header row */}
      <div className="grid flex-shrink-0 grid-cols-7 border-b border-border bg-white">
        {DOW_LABELS.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-xs font-semibold text-text-secondary"
          >
            {label}
          </div>
        ))}
      </div>

      {/* 6x7 day grid */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6 overflow-y-auto border-r border-t border-border">
        {gridDays.map((day) => (
          <MonthDayCell
            key={day.toISOString()}
            day={day}
            monthAnchor={monthAnchor}
            events={events.filter((e) => isSameDay(new Date(e.startAt), day))}
            lobbyMap={lobbyMap}
            onDayClick={onDayClick}
          />
        ))}
      </div>

      <CalendarLegend />
    </div>
  );
}
