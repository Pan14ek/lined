import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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

const getCancelErrorMessage = (error: unknown, t: TFunction<'subscription'>): string => {
  return getApiErrorMessage(
    error,
    { 404: t('currentPlan.errors.notFound') },
    t('currentPlan.errors.generic'),
  );
}

export const CurrentPlanCard = ({
  userId,
  activeSubscription,
  activePlanDetails,
  isLoading,
}: CurrentPlanCardProps) => {
  const { t } = useTranslation('subscription');
  const cancelSubscription = useCancelSubscription(userId);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (isLoading) {
    return (
      <SettingsCard id="current-plan" title={t('currentPlan.title')}>
        <div className="h-16 animate-pulse rounded-lg bg-input-bg" data-testid="current-plan-loading" />
      </SettingsCard>
    );
  }

  return (
    <SettingsCard id="current-plan" title={t('currentPlan.title')}>
      {activeSubscription ? (
        <div className="flex items-center justify-between py-3.5">
          <div>
            <div className="text-base font-bold text-text-primary">
              {activeSubscription.planName}
              {activePlanDetails
                ? ` · ${t('currentPlan.priceMonthly', { price: formatPlanPrice(activePlanDetails.priceUsd) })}`
                : ''}
            </div>
            <div className="mt-0.5 text-xs text-text-secondary">
              {t('currentPlan.renews', { date: formatShortDate(activeSubscription.endDate) })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            className="h-9 flex-shrink-0 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            {t('currentPlan.cancelButton')}
          </button>
        </div>
      ) : (
        <p className="py-3.5 text-sm text-text-secondary">{t('currentPlan.freePlan')}</p>
      )}

      {isConfirmOpen && (
        <ConfirmDialog
          title={t('currentPlan.cancelDialog.title')}
          message={t('currentPlan.cancelDialog.message')}
          confirmLabel={t('currentPlan.cancelDialog.confirmLabel')}
          danger
          isPending={cancelSubscription.isPending}
          error={cancelSubscription.isError ? getCancelErrorMessage(cancelSubscription.error, t) : null}
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
