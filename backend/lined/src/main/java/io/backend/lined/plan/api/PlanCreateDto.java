package io.backend.lined.plan.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;

public record PlanCreateDto(
    @Schema(example = "PRO_MONTHLY", description = "Unique plan name")
    String name,

    @Schema(example = "9.99", description = "Plan price in USD")
    BigDecimal priceUsd,

    @Schema(example = "30", description = "Plan duration in days")
    int durationDays
) {
}
