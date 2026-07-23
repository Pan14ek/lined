package io.backend.lined.billing.domain.account;

/**
 * Lifecycle state of a billing account.
 *
 * <p>BE-01 supports only {@link #ACTIVE}; for example, every account created during registration
 * begins in this state. Later tasks may add suspended or closed states without changing account
 * ownership.</p>
 */
public enum BillingAccountStatus {
  ACTIVE
}
