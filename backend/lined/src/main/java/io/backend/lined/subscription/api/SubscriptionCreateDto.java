package io.backend.lined.subscription.api;

import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

public record SubscriptionCreateDto(
    @NotNull long userId,
    @NotNull long planId,
    OffsetDateTime startDate,
    OffsetDateTime endDate,
    boolean isActive
) {
}
