import { addDays, getWeekStart, isSameDay, isToday } from '@/features/calendar/lib/calendarUtils';

interface DayChipStripProps {
  selectedDay: Date;
  onSelectDay: (day: Date) => void;
}

/** Horizontal, scrollable week-of-`selectedDay` strip of day chips — the
 *  phone-only date picker above the single-day calendar column. */
export const DayChipStrip = ({ selectedDay, onSelectDay }: DayChipStripProps) => {
  const weekStart = getWeekStart(selectedDay);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div
      role="tablist"
      aria-label="Select day"
      className="flex flex-shrink-0 gap-2 overflow-x-auto border-b border-border bg-surface px-3 py-2"
    >
      {days.map((day) => {
        const selected = isSameDay(day, selectedDay);
        const today = isToday(day);
        return (
          <button
            key={day.toISOString()}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelectDay(day)}
            className={`flex flex-shrink-0 flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              selected
                ? 'bg-brand-green text-white'
                : today
                  ? 'bg-brand-green-light text-brand-green-dark'
                  : 'text-text-secondary hover:bg-bg'
            }`}
          >
            <span>{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
            <span className="text-sm font-semibold">{day.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
};
