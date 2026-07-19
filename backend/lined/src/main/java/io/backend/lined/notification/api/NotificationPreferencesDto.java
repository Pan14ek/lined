package io.backend.lined.notification.api;

public record NotificationPreferencesDto(
    long version,
    boolean sharedEventsEnabled,
    boolean taskAssignedEnabled,
    boolean freeSlotsEnabled,
    boolean eventRemindersEnabled,
    boolean emailDigestsEnabled
) {
  public NotificationPreferencesDto(boolean sharedEventsEnabled, boolean taskAssignedEnabled,
                                    boolean freeSlotsEnabled, boolean eventRemindersEnabled,
                                    boolean emailDigestsEnabled) {
    this(0L, sharedEventsEnabled, taskAssignedEnabled, freeSlotsEnabled, eventRemindersEnabled,
        emailDigestsEnabled);
  }
}
