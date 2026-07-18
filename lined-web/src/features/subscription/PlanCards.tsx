import type { PlanDto } from '@/features/subscription/model';
import { useStartSubscription } from '@/features/subscription/hooks/useSubscriptions';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { formatPlanPrice } from '@/features/subscription/lib/subscriptionUtils';

interface PlanCardsProps {
  userId: number;
  plans: PlanDto[] | undefined;
  isLoading: boolean;
  currentPlanId: number | undefined;
}

const getSubscribeErrorMessage = (error: unknown): string => {
  return getApiErrorMessage(
    error,
    { 409: 'You already have an active plan — cancel it first to switch' },
    'Could not start your subscription — please try again',
  );
}

const PlanCardsSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3" data-testid="plan-cards-loading">
    {Array.from({ length: 3 }, (_, i) => (
      <div key={i} className="h-40 animate-pulse rounded-xl bg-surface" />
    ))}
  </div>
);

export const PlanCards = ({ userId, plans, isLoading, currentPlanId }: PlanCardsProps) => {
  const startSubscription = useStartSubscription(userId);

  if (isLoading) return <PlanCardsSkeleton />;

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans?.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border-[1.5px] bg-surface p-5 ${
                isCurrent ? 'border-brand-green' : 'border-border'
              }`}
            >
              {isCurrent && (
                <span className="absolute right-4 top-4 rounded-full bg-brand-green px-2 py-0.5 text-[10px] font-bold text-white">
                  CURRENT
                </span>
              )}
              <div className="text-sm font-semibold text-text-primary">{plan.name}</div>
              <div className="mt-1 text-xl font-bold text-text-primary">
                {formatPlanPrice(plan.priceUsd)}
                {plan.priceUsd > 0 && (
                  <span className="text-xs font-normal text-text-secondary"> / month</span>
                )}
              </div>
              <button
                type="button"
                disabled={isCurrent || startSubscription.isPending}
                onClick={() => startSubscription.mutate(plan.id)}
                className={`mt-4 h-9 w-full rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
                  isCurrent
                    ? 'bg-brand-green-light text-brand-green-dark dark:text-brand-green'
                    : 'bg-brand-green text-white hover:bg-brand-green-dark'
                }`}
              >
                {isCurrent ? 'Your plan' : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>
      {startSubscription.isError && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          {getSubscribeErrorMessage(startSubscription.error)}
        </p>
      )}
    </div>
  );
};
