import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { PlanDto } from '@/features/subscription/model';
import { useStartSubscription } from '@/features/subscription/hooks/useSubscriptions';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { formatPlanPrice } from '@/features/subscription/lib/subscriptionUtils';
import { Button } from '@/components/design-system/actions/Button';
import { ErrorState } from '@/components/patterns/ErrorState';
import { SkeletonCard } from '@/components/skeletons/SkeletonCard';
import { useQueryStall } from '@/hooks/useQueryStall';
import { cn } from '@/lib/utils';

interface PlanCardsProps {
  userId: number;
  plans: PlanDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  currentPlanId: number | undefined;
}

const getSubscribeErrorMessage = (error: unknown, t: TFunction<'subscription'>): string => {
  return getApiErrorMessage(
    error,
    { 409: t('planCards.errors.conflict') },
    t('planCards.errors.generic'),
  );
}

const PlanCardsSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3" data-testid="plan-cards-loading">
    {Array.from({ length: 3 }, (_, i) => (
      <SkeletonCard key={i} className="h-40" />
    ))}
  </div>
);

export const PlanCards = ({
  userId,
  plans,
  isLoading,
  isError,
  onRetry,
  currentPlanId,
}: PlanCardsProps) => {
  const { t } = useTranslation('subscription');
  const startSubscription = useStartSubscription(userId);
  const isStalled = useQueryStall(isLoading);

  if (isStalled || (!isLoading && isError)) {
    return <ErrorState onRetry={onRetry} title={t('planCards.errors.loadFailed')} />;
  }

  if (isLoading) return <PlanCardsSkeleton />;

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans?.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          return (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-xl border-[1.5px] bg-surface p-5',
                isCurrent ? 'border-brand-green' : 'border-border',
              )}
            >
              {isCurrent && (
                <span className="absolute right-4 top-4 rounded-full bg-brand-green px-2 py-0.5 text-[10px] font-bold text-white">
                  {t('planCards.current')}
                </span>
              )}
              <div className="text-sm font-semibold text-text-primary">{plan.name}</div>
              <div className="mt-1 text-xl font-bold text-text-primary">
                {formatPlanPrice(plan.priceUsd)}
                {plan.priceUsd > 0 && (
                  <span className="text-xs font-normal text-text-secondary">{t('planCards.perMonth')}</span>
                )}
              </div>
              <Button
                disabled={isCurrent}
                loading={!isCurrent && startSubscription.isPending}
                onClick={() => startSubscription.mutate(plan.id)}
                fullWidth
                className={cn('mt-4', isCurrent && 'bg-brand-green-light text-brand-green-dark dark:text-brand-green')}
              >
                {isCurrent ? t('planCards.yourPlan') : t('planCards.subscribe')}
              </Button>
            </div>
          );
        })}
      </div>
      {startSubscription.isError && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          {getSubscribeErrorMessage(startSubscription.error, t)}
        </p>
      )}
    </div>
  );
};
