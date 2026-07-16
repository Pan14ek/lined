package io.backend.lined.notification.api;

public record NotificationPreferencesDto(
    boolean sharedEventsEnabled,
    boolean taskAssignedEnabled,
    boolean freeSlotsEnabled,
    boolean eventRemindersEnabled,
    boolean emailDigestsEnabled
) {
}
