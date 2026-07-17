import { useMemo } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePlans, useActivePlan, useSubscriptionHistory } from '@/hooks/useSubscriptions';
import { CurrentPlanCard } from '@/components/subscription/CurrentPlanCard';
import { PlanCards } from '@/components/subscription/PlanCards';
import { SubscriptionHistoryCard } from '@/components/subscription/SubscriptionHistoryCard';

export function SubscriptionPage() {
  const { data: user } = useCurrentUser();
  const userId = user?.id;

  const { data: plans, isLoading: isPlansLoading } = usePlans();
  const { data: activeSubscription, isLoading: isActiveLoading } = useActivePlan(userId);
  const { data: history, isLoading: isHistoryLoading } = useSubscriptionHistory(userId);

  const planPriceById = useMemo(
    () => new Map((plans ?? []).map((plan) => [plan.id, plan.priceUsd])),
    [plans],
  );
  const activePlanDetails = plans?.find((plan) => plan.id === activeSubscription?.planId);

  return (
    <div className="flex-1 overflow-y-auto bg-bg p-8">
      <h1 className="mb-5 text-xl font-bold text-text-primary">Subscription</h1>

      <CurrentPlanCard
        userId={userId ?? 0}
        activeSubscription={activeSubscription}
        activePlanDetails={activePlanDetails}
        isLoading={isActiveLoading}
      />

      <div className="mb-2 mt-2 text-sm font-bold text-text-primary">Available Plans</div>
      <div className="mb-5">
        <PlanCards
          userId={userId ?? 0}
          plans={plans}
          isLoading={isPlansLoading}
          currentPlanId={activeSubscription?.planId}
        />
      </div>

      <SubscriptionHistoryCard
        history={history}
        isLoading={isHistoryLoading}
        planPriceById={planPriceById}
      />
    </div>
  );
}
