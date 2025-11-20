package io.backend.lined.plan.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;

public record PlanUpdateDto(
    @Schema(example = "PRO_MONTHLY", description = "Unique plan name")
    String name,

    @Schema(example = "12.99", description = "Updated plan price in USD")
    BigDecimal priceUsd,

    @Schema(example = "30", description = "Plan duration in days")
    int durationDays
) {
}
