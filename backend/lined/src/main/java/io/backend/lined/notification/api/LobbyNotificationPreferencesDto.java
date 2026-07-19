package io.backend.lined.notification.api;

public record LobbyNotificationPreferencesDto(
    Long lobbyId,
    long version,
    boolean newEventsEnabled,
    boolean taskUpdatesEnabled,
    boolean freeSlotsEnabled
) {
  public LobbyNotificationPreferencesDto(Long lobbyId, boolean newEventsEnabled,
                                         boolean taskUpdatesEnabled, boolean freeSlotsEnabled) {
    this(lobbyId, 0L, newEventsEnabled, taskUpdatesEnabled, freeSlotsEnabled);
  }
}
