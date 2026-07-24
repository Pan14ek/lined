import { useTranslation } from 'react-i18next';
import type { SubscriptionDto } from '@/features/subscription/model';
import { formatPlanPrice, formatShortDate } from '@/features/subscription/lib/subscriptionUtils';
import { SettingsCard } from '@/features/settings/SettingsCard';
import { LoadErrorState } from '@/components/LoadErrorState';
import { SkeletonRow } from '@/components/skeletons/SkeletonRow';
import { useQueryStall } from '@/hooks/useQueryStall';
import { cn } from '@/lib/utils';

interface SubscriptionHistoryCardProps {
  history: SubscriptionDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  planPriceById: Map<number, number>;
}

const SubscriptionHistorySkeleton = () => (
  <div className="space-y-2 py-3.5" data-testid="subscription-history-loading">
    <SkeletonRow className="h-10" />
    <SkeletonRow className="h-10" />
  </div>
);

export const SubscriptionHistoryCard = ({
  history,
  isLoading,
  isError,
  onRetry,
  planPriceById,
}: SubscriptionHistoryCardProps) => {
  const { t } = useTranslation('subscription');
  const isStalled = useQueryStall(isLoading);

  return (
    <SettingsCard id="subscription-history" title={t('history.title')}>
      {isStalled || (!isLoading && isError) ? (
        <LoadErrorState onRetry={onRetry} message={t('history.loadError')} />
      ) : isLoading ? (
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
                  {price != null && price > 0
                    ? ` · ${t('history.priceMonthly', { price: formatPlanPrice(price) })}`
                    : price != null
                      ? ` · ${formatPlanPrice(price)}`
                      : ''}
                </div>
                <div className="mt-0.5 text-xs text-text-secondary">
                  {formatShortDate(sub.startDate)} –{' '}
                  {sub.active ? t('history.present') : formatShortDate(sub.endDate)}
                </div>
              </div>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                  sub.active ? 'bg-task-done/10 text-task-done' : 'bg-task-todo/10 text-task-todo',
                )}
              >
                {sub.active ? t('history.statusActive') : t('history.statusEnded')}
              </span>
            </div>
          );
        })
      ) : (
        <p className="py-3.5 text-sm text-text-secondary">{t('history.empty')}</p>
      )}
    </SettingsCard>
  );
};
