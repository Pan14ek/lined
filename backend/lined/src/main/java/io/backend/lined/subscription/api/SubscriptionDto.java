package io.backend.lined.subscription.api;

import java.time.OffsetDateTime;

public record SubscriptionDto(
    long id,
    long userId,
    long planId,
    String planName,
    OffsetDateTime startDate,
    OffsetDateTime endDate,
    boolean isActive,
    OffsetDateTime createdAt
) {
}
