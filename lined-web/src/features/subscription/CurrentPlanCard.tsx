import { useState } from 'react';
import type { PlanDto, SubscriptionDto } from '@/features/subscription/model';
import { useCancelSubscription } from '@/features/subscription/hooks/useSubscriptions';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { formatPlanPrice, formatShortDate } from '@/features/subscription/lib/subscriptionUtils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SettingsCard } from '@/features/settings/SettingsCard';

interface CurrentPlanCardProps {
  userId: number;
  activeSubscription: SubscriptionDto | null | undefined;
  activePlanDetails: PlanDto | undefined;
  isLoading: boolean;
}

const getCancelErrorMessage = (error: unknown): string => {
  return getApiErrorMessage(
    error,
    { 404: 'You have no active subscription to cancel' },
    'Could not cancel your subscription — please try again',
  );
}

export const CurrentPlanCard = ({
  userId,
  activeSubscription,
  activePlanDetails,
  isLoading,
}: CurrentPlanCardProps) => {
  const cancelSubscription = useCancelSubscription(userId);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (isLoading) {
    return (
      <SettingsCard id="current-plan" title="Current Plan">
        <div className="h-16 animate-pulse rounded-lg bg-input-bg" data-testid="current-plan-loading" />
      </SettingsCard>
    );
  }

  return (
    <SettingsCard id="current-plan" title="Current Plan">
      {activeSubscription ? (
        <div className="flex items-center justify-between py-3.5">
          <div>
            <div className="text-base font-bold text-text-primary">
              {activeSubscription.planName}
              {activePlanDetails ? ` · ${formatPlanPrice(activePlanDetails.priceUsd)}/month` : ''}
            </div>
            <div className="mt-0.5 text-xs text-text-secondary">
              Renews {formatShortDate(activeSubscription.endDate)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            className="h-9 flex-shrink-0 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Cancel subscription
          </button>
        </div>
      ) : (
        <p className="py-3.5 text-sm text-text-secondary">You are on the free plan.</p>
      )}

      {isConfirmOpen && (
        <ConfirmDialog
          title="Cancel subscription"
          message="Your plan will be cancelled immediately. You'll keep access to the free plan's features."
          confirmLabel="Cancel subscription"
          danger
          isPending={cancelSubscription.isPending}
          error={cancelSubscription.isError ? getCancelErrorMessage(cancelSubscription.error) : null}
          onConfirm={() =>
            cancelSubscription.mutate(undefined, {
              onSuccess: () => setIsConfirmOpen(false),
            })
          }
          onCancel={() => setIsConfirmOpen(false)}
        />
      )}
    </SettingsCard>
  );
};
