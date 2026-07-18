import { DEFAULT_LEGEND_ITEMS, type LegendItem } from '@/features/calendar/lib/constants';

export const CalendarLegend = ({ items = DEFAULT_LEGEND_ITEMS }: { items?: LegendItem[] }) => {
  return (
    <div className="flex flex-shrink-0 items-center gap-5 overflow-x-auto whitespace-nowrap border-t border-border bg-surface px-4 py-2 md:px-8">
      {items.map(({ label, color }) => (
        <div key={label} className="flex flex-shrink-0 items-center gap-1.5 text-[11px] text-text-secondary">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </div>
      ))}
    </div>
  );
}
