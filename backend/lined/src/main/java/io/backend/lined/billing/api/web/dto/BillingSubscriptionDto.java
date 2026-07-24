package io.backend.lined.billing.api.web.dto;

/**
 * Placeholder for the provider-backed subscription displayed by the billing-state endpoint.
 *
 * <p>BE-04 always returns {@code null} for this type, for example {@code "subscription":null}.
 * BE-11 will define its fields when verified provider subscription state exists.</p>
 */
public record BillingSubscriptionDto() {
}
