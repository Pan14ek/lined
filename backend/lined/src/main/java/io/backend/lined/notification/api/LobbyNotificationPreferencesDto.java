package io.backend.lined.notification.api;

public record LobbyNotificationPreferencesDto(
    Long lobbyId,
    boolean newEventsEnabled,
    boolean taskUpdatesEnabled,
    boolean freeSlotsEnabled
) {
}
