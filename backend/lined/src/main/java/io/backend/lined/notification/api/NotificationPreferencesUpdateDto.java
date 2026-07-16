package io.backend.lined.notification.api;

public record NotificationPreferencesUpdateDto(
    Boolean sharedEventsEnabled,
    Boolean taskAssignedEnabled,
    Boolean freeSlotsEnabled,
    Boolean eventRemindersEnabled,
    Boolean emailDigestsEnabled
) {
}
