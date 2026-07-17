import { X } from 'lucide-react';
import type { EventDto, LobbyDto } from '@/types';
import { formatClockTime, formatFullDate } from '@/lib/calendarUtils';
import { lobbyAccentColor } from '@/lib/constants';

interface DayAgendaPanelProps {
  day: Date;
  events: EventDto[];
  lobbies: LobbyDto[];
  selectedEventId: number | null;
  onEventClick: (id: number) => void;
  onClose: () => void;
}

/**
 * Right-docked sidebar (matches EventDetailPanel's shell) listing every event
 * on a given day — the global calendar's overlap/overflow entry point, since
 * that view doesn't have a single lobby to scope a modal to.
 */
export function DayAgendaPanel({
  day,
  events,
  lobbies,
  selectedEventId,
  onEventClick,
  onClose,
}: DayAgendaPanelProps) {
  const lobbyMap = new Map(lobbies.map((l) => [l.id, l]));
  const sorted = [...events].sort((a, b) => a.startAt.localeCompare(b.startAt));

  return (
    <div className="m-4 ml-0 w-72 flex-shrink-0 self-start overflow-hidden rounded-xl bg-white shadow-[var(--shadow-md)]">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <h3 className="text-sm font-bold text-text-primary">{formatFullDate(day)}</h3>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex-shrink-0 text-text-muted hover:text-text-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-5 pb-4">
        {sorted.length === 0 ? (
          <p className="py-2 text-sm text-text-secondary">No events today.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sorted.map((event) => {
              const lobby = lobbyMap.get(event.lobbyId);
              const accentColor = lobby ? lobbyAccentColor(lobby.lobbyType) : 'var(--color-lobby-couple)';
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onEventClick(event.id)}
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-left transition-colors hover:bg-gray-50 ${
                      event.id === selectedEventId ? 'border-brand-green' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: accentColor }}
                      />
                      <span className="text-sm font-semibold text-text-primary">
                        {formatClockTime(new Date(event.startAt))} –{' '}
                        {formatClockTime(new Date(event.endAt))}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-text-primary">{event.title}</div>
                    {lobby && (
                      <div className="mt-0.5 text-xs text-text-secondary">{lobby.name}</div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
