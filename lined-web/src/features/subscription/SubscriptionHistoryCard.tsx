import type { SubscriptionDto } from '@/features/subscription/model';
import { formatPlanPrice, formatShortDate } from '@/features/subscription/lib/subscriptionUtils';
import { SettingsCard } from '@/features/settings/SettingsCard';
import { cn } from '@/lib/utils';

interface SubscriptionHistoryCardProps {
  history: SubscriptionDto[] | undefined;
  isLoading: boolean;
  planPriceById: Map<number, number>;
}

const SubscriptionHistorySkeleton = () => (
  <div className="space-y-2 py-3.5" data-testid="subscription-history-loading">
    <div className="h-10 animate-pulse rounded-lg bg-input-bg" />
    <div className="h-10 animate-pulse rounded-lg bg-input-bg" />
  </div>
);

export const SubscriptionHistoryCard = ({
  history,
  isLoading,
  planPriceById,
}: SubscriptionHistoryCardProps) => (
  <SettingsCard id="subscription-history" title="Subscription History">
    {isLoading ? (
      <SubscriptionHistorySkeleton />
    ) : history && history.length > 0 ? (
      history.map((sub) => {
        const price = planPriceById.get(sub.planId);
        return (
          <div
            key={sub.id}
            className="flex items-center justify-between border-b border-border py-3.5 last:border-b-0"
          >
            <div>
              <div className="text-sm font-medium text-text-primary">
                {sub.planName}
                {price != null ? ` · ${formatPlanPrice(price)}${price > 0 ? '/month' : ''}` : ''}
              </div>
              <div className="mt-0.5 text-xs text-text-secondary">
                {formatShortDate(sub.startDate)} –{' '}
                {sub.active ? 'present' : formatShortDate(sub.endDate)}
              </div>
            </div>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                sub.active ? 'bg-task-done/10 text-task-done' : 'bg-task-todo/10 text-task-todo',
              )}
            >
              {sub.active ? 'ACTIVE' : 'ENDED'}
            </span>
          </div>
        );
      })
    ) : (
      <p className="py-3.5 text-sm text-text-secondary">No subscription history yet.</p>
    )}
  </SettingsCard>
);
