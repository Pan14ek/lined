package io.backend.lined.plan.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PlanDto(
    @Schema(example = "1")
    long id,

    @Schema(example = "PRO_MONTHLY")
    String name,

    @Schema(example = "9.99")
    BigDecimal priceUsd,

    @Schema(example = "30")
    int durationDays,

    @Schema(example = "2025-01-01T10:15:30Z")
    OffsetDateTime createdAt
) {
}
