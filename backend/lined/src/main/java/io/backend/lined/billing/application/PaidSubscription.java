package io.backend.lined.billing.application;

import io.backend.lined.billing.domain.plan.PlanCode;
import java.time.Instant;

/**
 * Minimal provider-neutral view of a paid subscription needed to resolve an effective plan.
 *
 * <p>Example: {@code new PaidSubscription(PlanCode.PRO, Instant.parse("2026-08-01T00:00:00Z"))}
 * represents a Pro entitlement that remains valid until that provider-canonical period end.</p>
 *
 * @param planCode paid plan granted by the subscription; BE-01 recognizes {@code PRO}
 * @param currentPeriodEnd exclusive instant after which the paid entitlement no longer applies
 */
public record PaidSubscription(PlanCode planCode, Instant currentPeriodEnd) {
}
