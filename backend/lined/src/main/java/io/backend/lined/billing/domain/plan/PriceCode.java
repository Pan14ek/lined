package io.backend.lined.billing.domain.plan;

/**
 * Stable internal identifiers for purchasable Pro catalog prices.
 *
 * <p>For example, a checkout request can name {@link #PRO_MONTHLY}; billing resolves that code
 * to a trusted provider price identifier stored in the catalog. Clients never send the provider
 * identifier, currency, or amount directly.</p>
 */
public enum PriceCode {
  PRO_MONTHLY,
  PRO_YEARLY
}
