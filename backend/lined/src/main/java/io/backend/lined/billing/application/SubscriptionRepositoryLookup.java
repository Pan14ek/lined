package io.backend.lined.billing.application;

import io.backend.lined.billing.domain.subscription.SubscriptionEntity;
import io.backend.lined.billing.domain.subscription.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Repository-backed adapter that exposes the current subscription projection to entitlement code.
 *
 * <p>For example, if account {@code 17} has one active sandbox Pro subscription, this adapter
 * returns its plan, lifecycle status, period end, and optional grace end. Canceled and expired
 * history is intentionally absent because the repository only selects non-terminal states.</p>
 */
@Component
@RequiredArgsConstructor
public class SubscriptionRepositoryLookup implements PaidSubscriptionLookupPort {

  private final SubscriptionRepository subscriptionRepository;

  /**
   * Loads and converts an account's current subscription projection.
   *
   * <p>For example, a {@code PAST_DUE} row retains its {@code graceEndsAt} so the effective-plan
   * resolver can decide whether the three-day product grace window is still open.</p>
   *
   * @param billingAccountId local billing-account identifier
   * @return a provider-neutral access view, or an empty result without non-terminal state
   */
  @Override
  public java.util.Optional<PaidSubscription> findCurrentByBillingAccountId(Long billingAccountId) {
    return subscriptionRepository.findCurrentByBillingAccountId(billingAccountId)
        .map(this::toPaidSubscription);
  }

  private PaidSubscription toPaidSubscription(SubscriptionEntity subscription) {
    return new PaidSubscription(
        subscription.getPlanCode(),
        subscription.getStatus(),
        subscription.getCurrentPeriodEnd(),
        subscription.isCancelAtPeriodEnd(),
        subscription.getGraceEndsAt());
  }
}
