import { X } from 'lucide-react';
import type { EventDto } from '@/features/calendar/model';
import type { LobbyDto } from '@/features/lobby/model';
import { formatClockTime, formatFullDate } from '@/features/calendar/lib/calendarUtils';
import { lobbyAccentColor } from '@/features/lobby/lib/constants';

interface DayAgendaPanelProps {
  day: Date;
  events: EventDto[];
  lobbies: LobbyDto[];
  selectedEventId: number | null;
  onEventClick: (id: number) => void;
  onClose: () => void;
}

export const DayAgendaPanel = ({
  day,
  events,
  lobbies,
  selectedEventId,
  onEventClick,
  onClose,
}: DayAgendaPanelProps) => {
  const lobbyMap = new Map(lobbies.map((l) => [l.id, l]));
  const sorted = [...events].sort((a, b) => a.startAt.localeCompare(b.startAt));

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 max-h-[70vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-[var(--shadow-md)] md:relative md:inset-auto md:z-auto md:m-4 md:ml-0 md:max-h-none md:w-72 md:flex-shrink-0 md:self-start md:overflow-hidden md:rounded-xl">
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
