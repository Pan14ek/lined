package io.backend.lined.notification.service;

import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.event.domain.EventEntity;
import io.backend.lined.notification.api.LobbyNotificationPreferencesDto;
import io.backend.lined.notification.api.LobbyNotificationPreferencesUpdateDto;
import io.backend.lined.notification.api.NotificationDto;
import io.backend.lined.notification.api.NotificationPreferencesDto;
import io.backend.lined.notification.api.NotificationPreferencesUpdateDto;
import io.backend.lined.task.domain.TaskEntity;
import io.backend.lined.user.domain.UserEntity;
import java.util.List;

public interface NotificationService {

  NotificationPreferencesDto getPreferences(Long currentUserId);

  NotificationPreferencesDto updatePreferences(
      Long currentUserId, NotificationPreferencesUpdateDto dto, long expectedVersion);

  @Deprecated
  default NotificationPreferencesDto updatePreferences(
      Long currentUserId, NotificationPreferencesUpdateDto dto) {
    return updatePreferences(currentUserId, dto, -1L);
  }

  LobbyNotificationPreferencesDto getLobbyPreferences(Long lobbyId, Long currentUserId);

  LobbyNotificationPreferencesDto updateLobbyPreferences(
      Long lobbyId, Long currentUserId, LobbyNotificationPreferencesUpdateDto dto,
      long expectedVersion);

  @Deprecated
  default LobbyNotificationPreferencesDto updateLobbyPreferences(
      Long lobbyId, Long currentUserId, LobbyNotificationPreferencesUpdateDto dto) {
    return updateLobbyPreferences(lobbyId, currentUserId, dto, -1L);
  }

  List<NotificationDto> listMine(Long currentUserId);

  NotificationDto markRead(Long notificationId, Long currentUserId);

  void notifyTaskAssigned(UserEntity recipient, UserEntity actor, TaskEntity task);

  void notifySharedEventCreated(UserEntity recipient, UserEntity actor, Long eventId,
                                LobbyEntity lobby, String eventTitle);

  /**
   * Emits one preference-gated reminder for an event recipient.
   *
   * <p>For example, a current member receives an {@code EVENT_REMINDER} inbox entry for a shared
   * dinner, while a member with either reminders or new-event notifications disabled receives no
   * entry.</p>
   *
   * @param recipient current owner or member receiving the reminder
   * @param event event beginning within its effective reminder window
   */
  void notifyEventReminder(UserEntity recipient, EventEntity event);

  /**
   * Emits one preference-gated reminder for a task due today.
   *
   * <p>For example, an assigned grocery task creates a {@code TASK_DUE} inbox entry at 08:00 UTC
   * when task updates and global reminders are enabled.</p>
   *
   * @param recipient task assignee, or creator when the task has no assignee
   * @param task non-completed task whose due date is today
   */
  void notifyTaskDue(UserEntity recipient, TaskEntity task);
}
