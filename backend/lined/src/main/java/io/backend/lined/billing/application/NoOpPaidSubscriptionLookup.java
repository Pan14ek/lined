package io.backend.lined.billing.application;

import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
/**
 * Temporary subscription lookup used before the paid-subscription persistence model exists.
 *
 * <p>It deliberately exposes no paid subscriptions, so every account resolves to implicit Free.
 * For example, {@code findCurrentByBillingAccountId(17L)} returns {@link Optional#empty()}.
 * BE-06 replaces this adapter with a repository-backed implementation.</p>
 */
public class NoOpPaidSubscriptionLookup implements PaidSubscriptionLookupPort {

  /**
   * Returns no subscription because BE-01 has no persisted paid subscription domain yet.
   *
   * @param billingAccountId identifier that would identify the subscription owner
   * @return an empty result, causing the effective-plan resolver to select Free
   */
  @Override
  public Optional<PaidSubscription> findCurrentByBillingAccountId(Long billingAccountId) {
    return Optional.empty();
  }
}
