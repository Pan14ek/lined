package io.backend.lined.billing.application;

import io.backend.lined.billing.domain.plan.PlanCode;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EffectivePlanResolver {

  private final PaidSubscriptionLookupPort paidSubscriptionLookup;

  public PlanCode resolve(Long billingAccountId, Instant now) {
    return paidSubscriptionLookup.findCurrentByBillingAccountId(billingAccountId)
        .filter(subscription -> subscription.planCode() == PlanCode.PRO)
        .filter(subscription -> subscription.currentPeriodEnd().isAfter(now))
        .map(PaidSubscription::planCode)
        .orElse(PlanCode.FREE);
  }
}
