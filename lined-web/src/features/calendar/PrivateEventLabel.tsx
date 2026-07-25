import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { EventDto } from '@/features/calendar/model';

interface PrivateEventLabelProps {
  event: EventDto;
  /** Defaults to a 3.5-unit icon; pass a smaller size for compact chips. */
  iconClassName?: string;
}

/**
 * Icon + accessible label + truncated title for an event that may be
 * PRIVATE. Shared by every calendar surface that renders an event's title
 * inline (WeekGrid, MonthGrid, AgendaEventRow) — the caller supplies its
 * own flex/typography wrapper, this only renders the lock badge + title.
 */
export const PrivateEventLabel = ({ event, iconClassName = 'h-3 w-3' }: PrivateEventLabelProps) => {
  const { t } = useTranslation('calendar');
  return (
    <>
      {event.visibility === 'PRIVATE' && (
        <>
          <Lock aria-hidden="true" className={`${iconClassName} flex-shrink-0`} />
          <span className="sr-only">{t('privateEventAriaLabel')} </span>
        </>
      )}
      <span className="truncate">{event.title}</span>
    </>
  );
};
