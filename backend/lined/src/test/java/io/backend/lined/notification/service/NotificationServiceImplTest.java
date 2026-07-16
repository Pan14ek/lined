package io.backend.lined.notification.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.lobby.domain.LobbyTypes;
import io.backend.lined.lobby.service.LobbyAccessPolicy;
import io.backend.lined.notification.api.NotificationDto;
import io.backend.lined.notification.api.NotificationMapper;
import io.backend.lined.notification.domain.LobbyNotificationPreferenceEntity;
import io.backend.lined.notification.domain.LobbyNotificationPreferenceRepository;
import io.backend.lined.notification.domain.NotificationDeliveryChannel;
import io.backend.lined.notification.domain.NotificationDeliveryStatus;
import io.backend.lined.notification.domain.NotificationEntity;
import io.backend.lined.notification.domain.NotificationRepository;
import io.backend.lined.notification.domain.UserNotificationPreferenceEntity;
import io.backend.lined.notification.domain.UserNotificationPreferenceRepository;
import io.backend.lined.task.domain.TaskEntity;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

  @Mock
  private UserNotificationPreferenceRepository userPreferenceRepo;
  @Mock
  private LobbyNotificationPreferenceRepository lobbyPreferenceRepo;
  @Mock
  private NotificationRepository notificationRepo;
  @Mock
  private UserRepository userRepo;
  @Mock
  private LobbyRepository lobbyRepo;
  @Spy
  private LobbyAccessPolicy accessPolicy;
  @Mock
  private NotificationMapper mapper;

  @InjectMocks
  private NotificationServiceImpl notificationService;

  private UserEntity actor;
  private UserEntity recipient;
  private LobbyEntity lobby;
  private TaskEntity task;

  @BeforeEach
  void setUp() {
    actor = user(1L, "alex");
    recipient = user(2L, "sam");
    lobby = LobbyEntity.builder()
        .id(101L)
        .name("Family")
        .lobbyType(LobbyTypes.FAMILY)
        .owner(actor)
        .members(Set.of(actor, recipient))
        .build();
    task = TaskEntity.builder()
        .id(55L)
        .title("Buy groceries")
        .lobby(lobby)
        .creator(actor)
        .assignee(recipient)
        .build();
  }

  @Test
  void notifyTaskAssigned_queuesAllChannels_whenPreferencesAllow() {
    allowTaskNotifications();
    ArgumentCaptor<NotificationEntity> captor = ArgumentCaptor.forClass(NotificationEntity.class);

    notificationService.notifyTaskAssigned(recipient, actor, task);

    verify(notificationRepo).save(captor.capture());
    assertThat(captor.getValue().getDeliveries()).hasSize(3);
    assertThat(captor.getValue().getDeliveries())
        .anySatisfy(delivery -> assertThat(delivery.getChannel())
            .isEqualTo(NotificationDeliveryChannel.IN_APP));
    assertThat(captor.getValue().getDeliveries())
        .anySatisfy(delivery -> assertThat(delivery.getStatus())
            .isEqualTo(NotificationDeliveryStatus.PENDING));
  }

  @Test
  void notifyTaskAssigned_skipsSelfNotification() {
    notificationService.notifyTaskAssigned(actor, actor, task);

    verify(notificationRepo, never()).save(any());
  }

  @Test
  void notifyTaskAssigned_skipsUserOutsideLobby() {
    UserEntity outsider = user(3L, "outsider");

    notificationService.notifyTaskAssigned(outsider, actor, task);

    verify(notificationRepo, never()).save(any());
  }

  @Test
  void notifyTaskAssigned_skipsWhenGlobalPreferenceIsDisabled() {
    var global = UserNotificationPreferenceEntity.builder().taskAssignedEnabled(false).build();
    when(userPreferenceRepo.findByUserId(recipient.getId())).thenReturn(Optional.of(global));

    notificationService.notifyTaskAssigned(recipient, actor, task);

    verify(notificationRepo, never()).save(any());
  }

  @Test
  void notifySharedEventCreated_skipsWhenLobbyPreferenceIsDisabled() {
    var local = LobbyNotificationPreferenceEntity.builder().newEventsEnabled(false).build();
    when(userPreferenceRepo.findByUserId(recipient.getId())).thenReturn(Optional.empty());
    when(lobbyPreferenceRepo.findByUserIdAndLobbyId(recipient.getId(), lobby.getId()))
        .thenReturn(Optional.of(local));

    notificationService.notifySharedEventCreated(recipient, actor, 77L, lobby, "Dinner");

    verify(notificationRepo, never()).save(any());
  }

  @Test
  void markRead_rejectsAnotherUsersNotification() {
    when(notificationRepo.findByIdAndRecipientId(10L, recipient.getId())).thenReturn(Optional.empty());

    org.assertj.core.api.Assertions.assertThatThrownBy(
        () -> notificationService.markRead(10L, recipient.getId()))
        .hasMessageContaining("Notification 10 not found");
  }

  @Test
  void markRead_setsTimestampForRecipient() {
    var notification = NotificationEntity.builder().id(10L).recipient(recipient).build();
    var dto = new NotificationDto(10L, null, "title", "message", null, null,
        null, null, OffsetDateTime.now(), java.util.Set.of());
    when(notificationRepo.findByIdAndRecipientId(10L, recipient.getId()))
        .thenReturn(Optional.of(notification));
    when(mapper.toDto(notification)).thenReturn(dto);

    NotificationDto result = notificationService.markRead(10L, recipient.getId());

    assertThat(result).isEqualTo(dto);
    assertThat(notification.getReadAt()).isNotNull();
  }

  @Test
  void listMine_readsOnlyCurrentRecipientsNotifications() {
    when(userRepo.findById(recipient.getId())).thenReturn(Optional.of(recipient));
    when(notificationRepo.findAllByRecipientIdOrderByCreatedAtDesc(recipient.getId()))
        .thenReturn(List.of());

    assertThat(notificationService.listMine(recipient.getId())).isEmpty();

    verify(notificationRepo).findAllByRecipientIdOrderByCreatedAtDesc(recipient.getId());
  }

  private void allowTaskNotifications() {
    when(userPreferenceRepo.findByUserId(recipient.getId())).thenReturn(Optional.empty());
    when(lobbyPreferenceRepo.findByUserIdAndLobbyId(recipient.getId(), lobby.getId()))
        .thenReturn(Optional.empty());
  }

  private UserEntity user(Long id, String username) {
    UserEntity user = new UserEntity();
    user.setId(id);
    user.setUsername(username);
    return user;
  }
}
