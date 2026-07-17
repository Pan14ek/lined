import { DEFAULT_LEGEND_ITEMS, type LegendItem } from '@/lib/constants';

export function CalendarLegend({ items = DEFAULT_LEGEND_ITEMS }: { items?: LegendItem[] }) {
  return (
    <div className="flex flex-shrink-0 items-center gap-5 border-t border-border bg-white px-8 py-2">
      {items.map(({ label, color }) => (
        <div key={label} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </div>
      ))}
    </div>
  );
}
