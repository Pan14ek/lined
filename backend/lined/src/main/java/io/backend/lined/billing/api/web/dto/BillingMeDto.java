package io.backend.lined.billing.api.web.dto;

import io.backend.lined.billing.domain.plan.PlanCode;

/**
 * Authenticated caller's provider-neutral billing state.
 *
 * <p>For example, a newly registered caller receives {@code {"billingAccountId":17,
 * "effectivePlan":"FREE","subscription":null,"limits":{"lobbiesMax":1,
 * "lobbyMembersMax":4}}}. The shape remains stable while later billing tasks populate
 * {@link #subscription()}.</p>
 *
 * @param billingAccountId personal billing account owned by the authenticated user
 * @param effectivePlan currently applicable Free or Pro plan
 * @param subscription provider subscription details, {@code null} until BE-11
 * @param limits limits granted by {@code effectivePlan}
 */
public record BillingMeDto(
    Long billingAccountId,
    PlanCode effectivePlan,
    BillingSubscriptionDto subscription,
    BillingLimitsDto limits) {
}
