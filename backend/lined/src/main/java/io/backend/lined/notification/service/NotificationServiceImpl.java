package io.backend.lined.notification.service;

import io.backend.lined.common.EntityFinder;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.lobby.service.LobbyAccessPolicy;
import io.backend.lined.notification.api.LobbyNotificationPreferencesDto;
import io.backend.lined.notification.api.LobbyNotificationPreferencesUpdateDto;
import io.backend.lined.notification.api.NotificationDto;
import io.backend.lined.notification.api.NotificationMapper;
import io.backend.lined.notification.api.NotificationPreferencesDto;
import io.backend.lined.notification.api.NotificationPreferencesUpdateDto;
import io.backend.lined.notification.domain.LobbyNotificationPreferenceEntity;
import io.backend.lined.notification.domain.LobbyNotificationPreferenceRepository;
import io.backend.lined.notification.domain.NotificationDeliveryChannel;
import io.backend.lined.notification.domain.NotificationDeliveryEntity;
import io.backend.lined.notification.domain.NotificationDeliveryStatus;
import io.backend.lined.notification.domain.NotificationEntity;
import io.backend.lined.notification.domain.NotificationRepository;
import io.backend.lined.notification.domain.NotificationType;
import io.backend.lined.notification.domain.UserNotificationPreferenceEntity;
import io.backend.lined.notification.domain.UserNotificationPreferenceRepository;
import io.backend.lined.task.domain.TaskEntity;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImpl implements NotificationService {

  private final UserNotificationPreferenceRepository userPreferenceRepo;
  private final LobbyNotificationPreferenceRepository lobbyPreferenceRepo;
  private final NotificationRepository notificationRepo;
  private final UserRepository userRepo;
  private final LobbyRepository lobbyRepo;
  private final LobbyAccessPolicy accessPolicy;
  private final NotificationMapper mapper;

  @Override
  public NotificationPreferencesDto getPreferences(Long currentUserId) {
    mustUser(currentUserId);
    return mapper.toDto(globalPreferences(currentUserId));
  }

  @Override
  public NotificationPreferencesDto updatePreferences(
      Long currentUserId, NotificationPreferencesUpdateDto dto) {
    var preferences = userPreferenceRepo.findByUserId(currentUserId)
        .orElseGet(() -> UserNotificationPreferenceEntity.builder()
            .user(mustUser(currentUserId))
            .build());
    applyGlobalUpdates(preferences, dto);
    return mapper.toDto(userPreferenceRepo.save(preferences));
  }

  @Override
  public LobbyNotificationPreferencesDto getLobbyPreferences(Long lobbyId, Long currentUserId) {
    var lobby = accessibleLobby(lobbyId, currentUserId);
    return mapper.toDto(lobbyPreferences(currentUserId, lobby));
  }

  @Override
  public LobbyNotificationPreferencesDto updateLobbyPreferences(
      Long lobbyId, Long currentUserId, LobbyNotificationPreferencesUpdateDto dto) {
    var lobby = accessibleLobby(lobbyId, currentUserId);
    var preferences = lobbyPreferenceRepo.findByUserIdAndLobbyId(currentUserId, lobbyId)
        .orElseGet(() -> LobbyNotificationPreferenceEntity.builder()
            .user(mustUser(currentUserId))
            .lobby(lobby)
            .build());
    applyLobbyUpdates(preferences, dto);
    return mapper.toDto(lobbyPreferenceRepo.save(preferences));
  }

  @Override
  public List<NotificationDto> listMine(Long currentUserId) {
    mustUser(currentUserId);
    return notificationRepo.findAllByRecipientIdOrderByCreatedAtDesc(currentUserId).stream()
        .map(mapper::toDto)
        .toList();
  }

  @Override
  public NotificationDto markRead(Long notificationId, Long currentUserId) {
    var notification = EntityFinder.findOrThrow(
        notificationRepo.findByIdAndRecipientId(notificationId, currentUserId),
        () -> new NotFoundException("Notification %d not found".formatted(notificationId)));
    if (notification.getReadAt() == null) {
      notification.setReadAt(OffsetDateTime.now());
    }
    return mapper.toDto(notification);
  }

  @Override
  public void notifyTaskAssigned(UserEntity recipient, UserEntity actor, TaskEntity task) {
    if (recipient.getId().equals(actor.getId()) || !allowsTaskAssignment(recipient, task.getLobby())) {
      return;
    }
    saveNotification(recipient, task.getLobby(), NotificationType.TASK_ASSIGNED,
        "New task assigned", "%s assigned you: %s".formatted(actor.getUsername(), task.getTitle()),
        task.getId(), null);
  }

  @Override
  public void notifySharedEventCreated(UserEntity recipient, UserEntity actor, Long eventId,
                                       LobbyEntity lobby, String eventTitle) {
    if (recipient.getId().equals(actor.getId()) || !allowsSharedEvent(recipient, lobby)) {
      return;
    }
    saveNotification(recipient, lobby, NotificationType.SHARED_EVENT_CREATED,
        "New shared event", "%s created: %s".formatted(actor.getUsername(), eventTitle),
        null, eventId);
  }

  private void saveNotification(UserEntity recipient, LobbyEntity lobby, NotificationType type,
                                String title, String message, Long taskId, Long eventId) {
    var notification = NotificationEntity.builder()
        .recipient(recipient)
        .lobby(lobby)
        .type(type)
        .title(title)
        .message(message)
        .taskId(taskId)
        .eventId(eventId)
        .build();
    notification.getDeliveries().add(delivery(notification, NotificationDeliveryChannel.IN_APP,
        NotificationDeliveryStatus.DELIVERED));
    notification.getDeliveries().add(delivery(notification, NotificationDeliveryChannel.EMAIL,
        NotificationDeliveryStatus.PENDING));
    notification.getDeliveries().add(delivery(notification, NotificationDeliveryChannel.PUSH,
        NotificationDeliveryStatus.PENDING));
    notificationRepo.save(notification);
  }

  private NotificationDeliveryEntity delivery(NotificationEntity notification,
                                               NotificationDeliveryChannel channel,
                                               NotificationDeliveryStatus status) {
    var now = OffsetDateTime.now();
    return NotificationDeliveryEntity.builder()
        .notification(notification)
        .channel(channel)
        .status(status)
        .queuedAt(now)
        .deliveredAt(status == NotificationDeliveryStatus.DELIVERED ? now : null)
        .build();
  }

  private boolean allowsTaskAssignment(UserEntity user, LobbyEntity lobby) {
    var global = globalPreferences(user.getId());
    var local = lobbyPreferences(user.getId(), lobby);
    return global.isTaskAssignedEnabled() && local.isTaskUpdatesEnabled();
  }

  private boolean allowsSharedEvent(UserEntity user, LobbyEntity lobby) {
    var global = globalPreferences(user.getId());
    var local = lobbyPreferences(user.getId(), lobby);
    return global.isSharedEventsEnabled() && local.isNewEventsEnabled();
  }

  private UserNotificationPreferenceEntity globalPreferences(Long userId) {
    return userPreferenceRepo.findByUserId(userId)
        .orElseGet(() -> UserNotificationPreferenceEntity.builder().build());
  }

  private LobbyNotificationPreferenceEntity lobbyPreferences(Long userId, LobbyEntity lobby) {
    return lobbyPreferenceRepo.findByUserIdAndLobbyId(userId, lobby.getId())
        .orElseGet(() -> LobbyNotificationPreferenceEntity.builder().lobby(lobby).build());
  }

  private LobbyEntity accessibleLobby(Long lobbyId, Long currentUserId) {
    var lobby = EntityFinder.findOrThrow(lobbyRepo.findById(lobbyId),
        () -> new NotFoundException("Lobby %d not found".formatted(lobbyId)));
    accessPolicy.ensureMember(lobby, currentUserId);
    return lobby;
  }

  private UserEntity mustUser(Long userId) {
    return EntityFinder.findOrThrow(userRepo.findById(userId),
        () -> new NotFoundException("User %d not found".formatted(userId)));
  }

  private void applyGlobalUpdates(UserNotificationPreferenceEntity entity,
                                  NotificationPreferencesUpdateDto dto) {
    if (dto.sharedEventsEnabled() != null) {
      entity.setSharedEventsEnabled(dto.sharedEventsEnabled());
    }
    if (dto.taskAssignedEnabled() != null) {
      entity.setTaskAssignedEnabled(dto.taskAssignedEnabled());
    }
    if (dto.freeSlotsEnabled() != null) {
      entity.setFreeSlotsEnabled(dto.freeSlotsEnabled());
    }
    if (dto.eventRemindersEnabled() != null) {
      entity.setEventRemindersEnabled(dto.eventRemindersEnabled());
    }
    if (dto.emailDigestsEnabled() != null) {
      entity.setEmailDigestsEnabled(dto.emailDigestsEnabled());
    }
  }

  private void applyLobbyUpdates(LobbyNotificationPreferenceEntity entity,
                                 LobbyNotificationPreferencesUpdateDto dto) {
    if (dto.newEventsEnabled() != null) {
      entity.setNewEventsEnabled(dto.newEventsEnabled());
    }
    if (dto.taskUpdatesEnabled() != null) {
      entity.setTaskUpdatesEnabled(dto.taskUpdatesEnabled());
    }
    if (dto.freeSlotsEnabled() != null) {
      entity.setFreeSlotsEnabled(dto.freeSlotsEnabled());
    }
  }
}
