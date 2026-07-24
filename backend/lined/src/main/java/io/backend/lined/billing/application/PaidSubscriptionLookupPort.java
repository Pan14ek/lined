package io.backend.lined.billing.application;

import java.util.Optional;

/**
 * Boundary through which effective-plan resolution obtains paid subscription state.
 *
 * <p>The port lets the resolver remain independent of JPA mapping and payment-provider details.
 * For example, the repository adapter returns an active Pro period for account {@code 17}, while
 * an account with only terminal history returns no current subscription.</p>
 */
public interface PaidSubscriptionLookupPort {

  /**
   * Looks up the current paid subscription for one billing account.
   *
   * <p>Example: an account with an active Pro period returns a value with {@code status=ACTIVE}
   * and its provider period end; an account with no non-terminal paid state returns
   * {@code Optional.empty()}.</p>
   *
   * @param billingAccountId identifier of the account whose subscription is requested
   * @return the current paid subscription when one is available
   */
  Optional<PaidSubscription> findCurrentByBillingAccountId(Long billingAccountId);
}
