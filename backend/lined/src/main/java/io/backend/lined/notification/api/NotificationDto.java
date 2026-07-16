package io.backend.lined.notification.api;

import io.backend.lined.notification.domain.NotificationType;
import java.time.OffsetDateTime;
import java.util.Set;

public record NotificationDto(
    Long id,
    NotificationType type,
    String title,
    String message,
    Long lobbyId,
    Long taskId,
    Long eventId,
    OffsetDateTime readAt,
    OffsetDateTime createdAt,
    Set<NotificationDeliveryDto> deliveries
) {
}
