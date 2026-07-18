import type { ReactNode } from 'react';
import type { EventDto } from '@/features/calendar/model';
import { formatClockTime } from '@/features/calendar/lib/calendarUtils';
import { cn } from '@/lib/utils';

interface AgendaEventRowProps {
  event: EventDto;
  accentColor: string;
  isSelected: boolean;
  secondaryContent?: ReactNode;
  onClick: (eventId: number) => void;
}

/** Selectable event summary shared by calendar day-agenda surfaces. */
export const AgendaEventRow = ({ event, accentColor, isSelected, secondaryContent, onClick }: AgendaEventRowProps) => {
  return (
    <button
      type="button"
      onClick={() => onClick(event.id)}
      className={cn(
        'w-full rounded-lg border px-3.5 py-2.5 text-left transition-colors hover:bg-surface-hover',
        isSelected ? 'border-brand-green' : 'border-border',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
        <span className="text-sm font-semibold text-text-primary">
          {formatClockTime(new Date(event.startAt))} – {formatClockTime(new Date(event.endAt))}
        </span>
      </div>
      <div className="mt-1 text-sm text-text-primary">{event.title}</div>
      {secondaryContent}
    </button>
  );
};
