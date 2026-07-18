import { X, MapPin, Sparkles } from 'lucide-react';
import type { EventDto } from '@/features/calendar/model';
import type { LobbyDto } from '@/features/lobby/model';
import { formatClockTime, formatFullDate, formatHourRange, type FreeSlot } from '@/features/calendar/lib/calendarUtils';
import { lobbyAccentColor } from '@/features/lobby/lib/constants';

interface DayAgendaModalProps {
  day: Date;
  events: EventDto[];
  freeSlots: FreeSlot[];
  lobby: LobbyDto;
  selectedEventId: number | null;
  onEventClick: (id: number) => void;
  onClose: () => void;
}

export const DayAgendaModal = ({
  day,
  events,
  freeSlots,
  lobby,
  selectedEventId,
  onEventClick,
  onClose,
}: DayAgendaModalProps) => {
  const sorted = [...events].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const accentColor = lobbyAccentColor(lobby.lobbyType);

  return (
    /* Backdrop */
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/45"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Dialog */}
      <div className="flex max-h-[80vh] w-[420px] max-w-[90vw] flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-lg)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-base font-bold text-text-primary">{formatFullDate(day)}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-6">
          {sorted.length === 0 ? (
            <p className="py-2 text-sm text-text-secondary">No events today.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sorted.map((event) => (
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
                    {event.location && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-text-secondary">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        {event.location}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {freeSlots.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Both free
              </h3>
              <ul className="flex flex-col gap-1.5">
                {freeSlots.map((slot, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm text-brand-green-dark"
                    style={{ backgroundColor: 'var(--color-free-slot)', opacity: 0.6 }}
                  >
                    <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                    {formatHourRange(slot.startHour, slot.endHour)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
