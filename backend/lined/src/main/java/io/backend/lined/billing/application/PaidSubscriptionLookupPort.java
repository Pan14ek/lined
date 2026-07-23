package io.backend.lined.billing.application;

import java.util.Optional;

/**
 * Boundary through which effective-plan resolution obtains paid subscription state.
 *
 * <p>The port lets the resolver remain independent of the later subscription schema and any
 * payment provider. For example, a future repository adapter can return a current Pro period for
 * account {@code 17}, while the BE-01 no-op adapter returns no value.</p>
 */
public interface PaidSubscriptionLookupPort {

  /**
   * Looks up the current paid subscription for one billing account.
   *
   * <p>Example: an account with an active Pro period returns
   * {@code Optional.of(new PaidSubscription(PlanCode.PRO, periodEnd))}; an account with no paid
   * state returns {@code Optional.empty()}.</p>
   *
   * @param billingAccountId identifier of the account whose subscription is requested
   * @return the current paid subscription when one is available
   */
  Optional<PaidSubscription> findCurrentByBillingAccountId(Long billingAccountId);
}
