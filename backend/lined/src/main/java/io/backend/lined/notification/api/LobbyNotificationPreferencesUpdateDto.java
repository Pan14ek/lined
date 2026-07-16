package io.backend.lined.notification.api;

public record LobbyNotificationPreferencesUpdateDto(
    Boolean newEventsEnabled,
    Boolean taskUpdatesEnabled,
    Boolean freeSlotsEnabled
) {
}
