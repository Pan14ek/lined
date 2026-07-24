package io.backend.lined.billing.domain.plan;

/**
 * Recurrence interval assigned to a catalog price.
 *
 * <p>For example, {@link #MONTH} identifies {@link PriceCode#PRO_MONTHLY}, while {@link #YEAR}
 * identifies {@link PriceCode#PRO_YEARLY}. The interval describes provider billing cadence; it
 * does not calculate a monetary amount or a period end date.</p>
 */
public enum BillingInterval {
  MONTH,
  YEAR
}
