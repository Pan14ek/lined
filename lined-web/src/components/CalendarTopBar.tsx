import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { ViewMode } from '@/store/calendar';

interface CalendarTopBarProps {
  title: string;
  viewMode: ViewMode;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onNewEvent: () => void;
}

export function CalendarTopBar({
  title,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onViewModeChange,
  onNewEvent,
}: CalendarTopBarProps) {
  return (
    <div className="flex h-16 flex-shrink-0 items-center gap-4 border-b border-border bg-white px-8 shadow-[var(--shadow-sm)]">
      {/* Month / week navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          aria-label={viewMode === 'month' ? 'Previous month' : 'Previous week'}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-gray-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="w-40 text-center text-base font-semibold text-text-primary select-none">
          {title}
        </span>
        <button
          onClick={onNext}
          aria-label={viewMode === 'month' ? 'Next month' : 'Next week'}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-gray-100"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Today button */}
      <button
        onClick={onToday}
        className="h-8 rounded-lg border border-border bg-white px-3 text-sm text-text-secondary hover:bg-gray-50"
      >
        Today
      </button>

      {/* Week / Month toggle */}
      <div className="flex overflow-hidden rounded-lg border border-border">
        {(['week', 'month'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={`px-4 py-1.5 text-sm font-[inherit] capitalize transition-colors ${
              viewMode === mode
                ? 'bg-brand-green font-semibold text-white'
                : 'bg-white text-text-secondary hover:bg-gray-50'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* + New event */}
      <button
        onClick={onNewEvent}
        className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-green px-4 text-sm font-semibold text-white hover:bg-brand-green-dark transition-colors"
      >
        <Plus className="h-4 w-4" />
        New event
      </button>
    </div>
  );
}
