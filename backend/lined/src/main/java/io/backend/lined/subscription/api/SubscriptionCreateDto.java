package io.backend.lined.subscription.api;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

public record SubscriptionCreateDto(
    @NotNull
    @Schema(example = "1", description = "User identifier")
    long userId,

    @NotNull
    @Schema(example = "2", description = "Plan identifier")
    long planId,

    @Schema(example = "2025-01-01T10:00:00Z", description = "Subscription start date, optional")
    OffsetDateTime startDate,

    @Schema(example = "2025-01-31T10:00:00Z", description = "Subscription end date, optional; if null will be calculated from plan duration")
    OffsetDateTime endDate,

    @Schema(example = "true", description = "Whether subscription should be active; if null defaults to true")
    Boolean active
) {
}
