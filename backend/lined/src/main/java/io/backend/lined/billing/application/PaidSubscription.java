package io.backend.lined.billing.application;

import io.backend.lined.billing.domain.plan.PlanCode;
import io.backend.lined.billing.domain.subscription.SubscriptionStatus;
import java.time.Instant;

/**
 * Minimal provider-neutral view of a paid subscription needed to resolve an effective plan.
 *
 * <p>Example: {@code new PaidSubscription(PlanCode.PRO, ACTIVE, periodEnd, true, null)}
 * represents a Pro entitlement whose cancellation is scheduled but remains valid until the
 * provider-canonical period end. A
 * {@code PAST_DUE} record instead supplies a grace-end instant, allowing the resolver to keep
 * Pro available only for the configured product grace period.</p>
 *
 * @param planCode paid plan granted by the subscription; BE-01 recognizes {@code PRO}
 * @param status canonical lifecycle state used for effective-plan policy evaluation
 * @param currentPeriodEnd exclusive provider instant after which an active entitlement ends
 * @param cancelAtPeriodEnd whether the provider has scheduled non-renewal at the period boundary
 * @param graceEndsAt exclusive local grace instant for a past-due subscription, or {@code null}
 *     when grace is not available
 */
public record PaidSubscription(
    PlanCode planCode,
    SubscriptionStatus status,
    Instant currentPeriodEnd,
    boolean cancelAtPeriodEnd,
    Instant graceEndsAt) {
}
