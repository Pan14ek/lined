package io.backend.lined.billing.application;

import io.backend.lined.billing.domain.plan.PlanCode;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
/**
 * Resolves the plan currently effective for a billing account.
 *
 * <p>Free is implicit: an absent, expired, or non-Pro paid subscription resolves to
 * {@link PlanCode#FREE}. This avoids persisting a Free subscription merely to represent the
 * default product state.</p>
 *
 * <p>Example: if account {@code 17} has a Pro subscription ending after the supplied instant,
 * {@code resolve(17L, now)} returns {@code PRO}; if the lookup is empty, it returns
 * {@code FREE}.</p>
 */
public class EffectivePlanResolver {

  private final PaidSubscriptionLookupPort paidSubscriptionLookup;

  /**
   * Determines the plan that applies at one precise instant.
   *
   * <p>The caller supplies time so that renewal-boundary behavior is deterministic in tests and
   * independent of the server clock. A subscription ending exactly at {@code now} is expired;
   * only an end time strictly after {@code now} grants Pro.</p>
   *
   * @param billingAccountId identifier used to look up paid subscription state
   * @param now instant at which entitlement is evaluated
   * @return {@code PRO} for a current Pro subscription; otherwise {@code FREE}
   */
  public PlanCode resolve(Long billingAccountId, Instant now) {
    return paidSubscriptionLookup.findCurrentByBillingAccountId(billingAccountId)
        .filter(subscription -> subscription.planCode() == PlanCode.PRO)
        .filter(subscription -> subscription.currentPeriodEnd().isAfter(now))
        .map(PaidSubscription::planCode)
        .orElse(PlanCode.FREE);
  }
}
