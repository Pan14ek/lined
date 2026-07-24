package io.backend.lined.billing.domain.subscription;

/**
 * Canonical local lifecycle states for a provider-backed subscription.
 *
 * <p>For example, a verified first payment changes {@link #PENDING} to {@link #ACTIVE}; a failed
 * renewal changes an active subscription to {@link #PAST_DUE}, while completed cancellation ends
 * in {@link #CANCELED}. These values are a projection of provider state, not a replacement for
 * the provider as the commercial source of truth.</p>
 */
public enum SubscriptionStatus {
  PENDING,
  ACTIVE,
  PAST_DUE,
  CANCELED,
  EXPIRED
}
