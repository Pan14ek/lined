import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FreeSlotBannerData } from '@/features/dashboard/hooks/useDashboard';
import { formatFreeSlotRange } from '@/features/calendar/lib/calendarUtils';

interface FreeSlotBannerProps {
  slot: FreeSlotBannerData | null;
  isLoading: boolean;
  onPlan?: (slot: FreeSlotBannerData) => void;
}

export const FreeSlotBanner = ({ slot, isLoading, onPlan }: FreeSlotBannerProps) => {
  const { t } = useTranslation('dashboard');
  if (isLoading || !slot) return null;

  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl bg-brand-green-light p-4">
      <Sparkles className="h-5 w-5 flex-shrink-0 text-brand-green-dark dark:text-brand-green" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-green-dark dark:text-brand-green">
          {t('freeSlot.title')}
        </p>
        <p className="text-xs text-brand-green-dark dark:text-brand-green">
          {t('freeSlot.bothFree', {
            name: slot.otherUsername ?? slot.lobbyName,
            range: formatFreeSlotRange(slot.start, slot.end),
          })}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onPlan?.(slot)}
        className="flex-shrink-0 text-xs font-semibold text-brand-green-dark dark:text-brand-green hover:underline"
      >
        {t('freeSlot.planSomething')}
      </button>
    </div>
  );
}
