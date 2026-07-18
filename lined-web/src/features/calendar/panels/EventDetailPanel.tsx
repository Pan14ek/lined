import { Clock, Link, MapPin, X } from 'lucide-react';
import type { EventDto } from '@/features/calendar/model';
import type { LobbyDto } from '@/features/lobby/model';
import { formatEventTime } from '@/features/calendar/lib/calendarUtils';
import { lobbyAccentColor } from '@/features/lobby/lib/constants';

interface EventDetailPanelProps {
  event: EventDto;
  lobby: LobbyDto;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleteError?: string | null;
}

export const EventDetailPanel = ({
  event,
  lobby,
  onClose,
  onEdit,
  onDelete,
  deleteError,
}: EventDetailPanelProps) => {
  const accentColor = lobbyAccentColor(lobby.lobbyType);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 max-h-[70vh] w-full overflow-y-auto rounded-t-2xl bg-surface shadow-[var(--shadow-md)] md:relative md:inset-auto md:z-auto md:m-4 md:ml-0 md:max-h-none md:w-72 md:flex-shrink-0 md:self-start md:overflow-hidden md:rounded-xl">
      {/* Coloured accent bar */}
      <div className="h-1" style={{ backgroundColor: accentColor }} />

      {/* Body */}
      <div className="p-5">
        {/* Title + close */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-text-primary leading-snug">
            {event.title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="mt-0.5 flex-shrink-0 text-text-muted hover:text-text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Lobby tag */}
        <span
          className="mb-3 inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: `color-mix(in srgb, ${accentColor} 12%, white)`,
            color: accentColor,
          }}
        >
          {lobby.name}
        </span>

        {/* Time */}
        <div className="mb-2 flex items-center gap-2 text-sm text-text-primary">
          <Clock className="h-3.5 w-3.5 flex-shrink-0 text-text-muted" />
          <span>{formatEventTime(event.startAt, event.endAt)}</span>
        </div>

        {/* Location */}
        {event.location && (
          <div className="mb-2 flex items-center gap-2 text-sm text-text-primary">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-text-muted" />
            <span>{event.location}</span>
          </div>
        )}

        {/* Shared badge */}
        {event.shared && (
          <div className="mb-2 flex items-center gap-2 text-sm text-text-primary">
            <Link className="h-3.5 w-3.5 flex-shrink-0 text-text-muted" />
            <span>Shared event</span>
          </div>
        )}

        {/* Divider */}
        <div className="my-3 h-px bg-border" />

        {deleteError && (
          <p className="mb-2 text-xs font-medium text-red-500">{deleteError}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 h-9 rounded-lg bg-brand-green text-sm font-semibold text-white hover:bg-brand-green-dark transition-colors"
          >
            Edit event
          </button>
          <button
            onClick={onDelete}
            className="flex-1 h-9 rounded-lg border border-red-500 bg-surface text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
