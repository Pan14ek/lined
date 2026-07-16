package io.backend.lined.notification.service;

import io.backend.lined.lobby.domain.LobbyEntity;
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
      Long currentUserId, NotificationPreferencesUpdateDto dto);

  LobbyNotificationPreferencesDto getLobbyPreferences(Long lobbyId, Long currentUserId);

  LobbyNotificationPreferencesDto updateLobbyPreferences(
      Long lobbyId, Long currentUserId, LobbyNotificationPreferencesUpdateDto dto);

  List<NotificationDto> listMine(Long currentUserId);

  NotificationDto markRead(Long notificationId, Long currentUserId);

  void notifyTaskAssigned(UserEntity recipient, UserEntity actor, TaskEntity task);

  void notifySharedEventCreated(UserEntity recipient, UserEntity actor, Long eventId,
                                LobbyEntity lobby, String eventTitle);
}
