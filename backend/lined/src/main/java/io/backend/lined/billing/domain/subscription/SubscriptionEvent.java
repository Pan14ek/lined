package io.backend.lined.billing.domain.subscription;

/**
 * Provider or product events that can move a subscription through its local state machine.
 *
 * <p>For example, {@link #PAYMENT_FAILED} turns an active renewal into {@code PAST_DUE}, while
 * {@link #NEW_CHECKOUT} creates a new pending lifecycle after a canceled or expired subscription.
 * Scheduling events deliberately retain the {@code ACTIVE} state because the provider-canonical
 * period remains paid until its end.</p>
 */
public enum SubscriptionEvent {
  PAYMENT_CONFIRMED,
  PAYMENT_FAILED,
  PAYMENT_RECOVERED,
  CANCELLATION_SCHEDULED,
  CANCELLATION_RESUMED,
  PRICE_CHANGE_SCHEDULED,
  PERIOD_ELAPSED,
  PROVIDER_EXPIRED,
  NEW_CHECKOUT
}
