package io.backend.lined.billing.application;

import io.backend.lined.billing.domain.plan.PlanCode;
import java.time.Instant;

public record PaidSubscription(PlanCode planCode, Instant currentPeriodEnd) {
}
