package io.backend.lined.billing.domain.account;

/**
 * Categorizes the commercial owner represented by a billing account.
 *
 * <p>BE-01 supports only {@link #PERSONAL}; for example, a registration for user {@code 42}
 * provisions one Personal account. The enum keeps the uniqueness boundary ready for future
 * account categories.</p>
 */
public enum BillingAccountType {
  PERSONAL
}
