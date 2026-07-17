import { Sparkles } from 'lucide-react';
import type { FreeSlotBannerData } from '@/hooks/useDashboard';
import { formatFreeSlotRange } from '@/lib/calendarUtils';

interface FreeSlotBannerProps {
  slot: FreeSlotBannerData | null;
  isLoading: boolean;
  onPlan?: (slot: FreeSlotBannerData) => void;
}

export function FreeSlotBanner({ slot, isLoading, onPlan }: FreeSlotBannerProps) {
  if (isLoading || !slot) return null;

  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl bg-brand-green-light p-4">
      <Sparkles className="h-5 w-5 flex-shrink-0 text-brand-green-dark" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-green-dark">Free time found!</p>
        <p className="text-xs text-brand-green-dark">
          You &amp; {slot.otherUsername ?? slot.lobbyName} are both free{' '}
          {formatFreeSlotRange(slot.start, slot.end)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onPlan?.(slot)}
        className="flex-shrink-0 text-xs font-semibold text-brand-green-dark hover:underline"
      >
        Plan something →
      </button>
    </div>
  );
}
