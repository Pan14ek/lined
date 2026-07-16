package io.backend.lined.notification.api;

import io.backend.lined.notification.domain.NotificationDeliveryChannel;
import io.backend.lined.notification.domain.NotificationDeliveryStatus;
import java.time.OffsetDateTime;

public record NotificationDeliveryDto(
    NotificationDeliveryChannel channel,
    NotificationDeliveryStatus status,
    OffsetDateTime queuedAt,
    OffsetDateTime deliveredAt
) {
}
