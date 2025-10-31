package io.backend.lined.plan.api;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PlanDto(
    long id,
    String name,
    BigDecimal priceUsd,
    int durationDays,
    OffsetDateTime createdAt
) {
}
