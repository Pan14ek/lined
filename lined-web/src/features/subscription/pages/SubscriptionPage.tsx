import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser';
import { usePlans, useActivePlan, useSubscriptionHistory } from '@/features/subscription/hooks/useSubscriptions';
import { CurrentPlanCard } from '@/features/subscription/CurrentPlanCard';
import { PlanCards } from '@/features/subscription/PlanCards';
import { SubscriptionHistoryCard } from '@/features/subscription/SubscriptionHistoryCard';

export const SubscriptionPage = () => {
  const { t } = useTranslation('subscription');
  const { data: user } = useCurrentUser();
  const userId = user?.id;

  const {
    data: plans,
    isLoading: isPlansLoading,
    isError: isPlansError,
    refetch: refetchPlans,
  } = usePlans();
  const {
    data: activeSubscription,
    isLoading: isActiveLoading,
    isError: isActiveError,
    refetch: refetchActive,
  } = useActivePlan(userId);
  const {
    data: history,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    refetch: refetchHistory,
  } = useSubscriptionHistory(userId);

  const planPriceById = useMemo(
    () => new Map((plans ?? []).map((plan) => [plan.id, plan.priceUsd])),
    [plans],
  );
  const activePlanDetails = plans?.find((plan) => plan.id === activeSubscription?.planId);

  return (
    <div className="flex-1 overflow-y-auto bg-bg p-8">
      <h1 className="mb-5 text-xl font-bold text-text-primary">{t('page.title')}</h1>

      <CurrentPlanCard
        userId={userId ?? 0}
        activeSubscription={activeSubscription}
        activePlanDetails={activePlanDetails}
        isLoading={isActiveLoading}
        isError={isActiveError}
        onRetry={() => void refetchActive()}
      />

      <div className="mb-2 mt-2 text-sm font-bold text-text-primary">{t('page.availablePlans')}</div>
      <div className="mb-5">
        <PlanCards
          userId={userId ?? 0}
          plans={plans}
          isLoading={isPlansLoading}
          isError={isPlansError}
          onRetry={() => void refetchPlans()}
          currentPlanId={activeSubscription?.planId}
        />
      </div>

      <SubscriptionHistoryCard
        history={history}
        isLoading={isHistoryLoading}
        isError={isHistoryError}
        onRetry={() => void refetchHistory()}
        planPriceById={planPriceById}
      />
    </div>
  );
}
