package io.backend.lined.notification.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import io.backend.lined.event.domain.EventEntity;
import io.backend.lined.event.domain.EventRepository;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.lobby.domain.LobbyTypes;
import io.backend.lined.task.domain.TaskEntity;
import io.backend.lined.task.domain.TaskRepository;
import io.backend.lined.task.domain.TaskStatus;
import io.backend.lined.user.domain.UserEntity;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Set;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ReminderServiceImplTest {

  private static final Instant NOW = Instant.parse("2026-07-25T08:00:00Z");

  @Mock
  private EventRepository eventRepo;
  @Mock
  private TaskRepository taskRepo;
  @Mock
  private LobbyRepository lobbyRepo;
  @Mock
  private NotificationService notificationService;

  private ReminderService reminderService;
  private UserEntity owner;
  private UserEntity member;
  private LobbyEntity lobby;

  @BeforeEach
  void setUp() {
    reminderService = new ReminderServiceImpl(Clock.fixed(NOW, ZoneOffset.UTC), eventRepo,
        taskRepo, lobbyRepo, notificationService);
    owner = user(1L, "owner");
    member = user(2L, "member");
    lobby = LobbyEntity.builder().id(101L).name("Family").lobbyType(LobbyTypes.FAMILY)
        .owner(owner).members(Set.of(owner, member)).build();
    lenient().when(lobbyRepo.findWithMembersById(101L)).thenReturn(Optional.of(lobby));
  }

  @Test
  void processDueReminders_notifiesEveryCurrentMemberForSharedEventAtWindowEdge() {
    var event = event(true, OffsetDateTime.ofInstant(NOW.plusSeconds(1800), ZoneOffset.UTC), null);
    when(eventRepo.findReminderCandidates(any(), any())).thenReturn(java.util.List.of(event));
    when(eventRepo.claimReminder(eq(9001L), eq(0L), any())).thenReturn(1);
    when(taskRepo.findDueReminderCandidates(LocalDate.of(2026, 7, 25))).thenReturn(java.util.List.of());

    reminderService.processDueReminders();

    verify(notificationService).notifyEventReminder(owner, event);
    verify(notificationService).notifyEventReminder(member, event);
    verify(eventRepo).claimReminder(eq(9001L), eq(0L), any());
  }

  @Test
  void processDueReminders_usesMembershipReloadedAfterTheEventClaim() {
    var event = event(true, OffsetDateTime.ofInstant(NOW.plusSeconds(60), ZoneOffset.UTC), null);
    var currentLobby = LobbyEntity.builder().id(101L).name("Family").lobbyType(LobbyTypes.FAMILY)
        .owner(owner).members(Set.of(owner)).build();
    when(eventRepo.findReminderCandidates(any(), any())).thenReturn(java.util.List.of(event));
    when(eventRepo.claimReminder(eq(9001L), eq(0L), any())).thenReturn(1);
    when(lobbyRepo.findWithMembersById(101L)).thenReturn(Optional.of(currentLobby));
    when(taskRepo.findDueReminderCandidates(any())).thenReturn(java.util.List.of());

    reminderService.processDueReminders();

    verify(notificationService).notifyEventReminder(owner, event);
    verify(notificationService, never()).notifyEventReminder(member, event);
  }

  @Test
  void processDueReminders_usesCustomLeadTimeAndSkipsDisabledEventReminder() {
    var custom = event(false, OffsetDateTime.ofInstant(NOW.plusSeconds(2700), ZoneOffset.UTC), 60);
    var disabled = event(false, OffsetDateTime.ofInstant(NOW.plusSeconds(60), ZoneOffset.UTC), 0);
    disabled.setId(9002L);
    when(eventRepo.findReminderCandidates(any(), any())).thenReturn(java.util.List.of(custom, disabled));
    when(eventRepo.claimReminder(eq(9001L), eq(0L), any())).thenReturn(1);
    when(taskRepo.findDueReminderCandidates(any())).thenReturn(java.util.List.of());

    reminderService.processDueReminders();

    verify(notificationService).notifyEventReminder(owner, custom);
    verify(eventRepo, never()).claimReminder(eq(9002L), any(Long.class), any());
  }

  @Test
  void processDueReminders_doesNotDuplicateWhenAnotherReplicaAlreadyClaimedEvent() {
    var event = event(false, OffsetDateTime.ofInstant(NOW.plusSeconds(60), ZoneOffset.UTC), null);
    when(eventRepo.findReminderCandidates(any(), any())).thenReturn(java.util.List.of(event));
    when(eventRepo.claimReminder(eq(9001L), eq(0L), any())).thenReturn(1, 0);
    when(taskRepo.findDueReminderCandidates(any())).thenReturn(java.util.List.of());

    reminderService.processDueReminders();
    reminderService.processDueReminders();

    verify(notificationService, times(1)).notifyEventReminder(owner, event);
  }

  @Test
  void processDueReminders_notifiesAssigneeForUnfinishedTaskAfterMorningCutoff() {
    var task = task(member, TaskStatus.TODO);
    when(eventRepo.findReminderCandidates(any(), any())).thenReturn(java.util.List.of());
    when(taskRepo.findDueReminderCandidates(LocalDate.of(2026, 7, 25))).thenReturn(java.util.List.of(task));
    when(taskRepo.claimDueReminder(55L, 0L, LocalDate.of(2026, 7, 25))).thenReturn(1);

    reminderService.processDueReminders();

    verify(notificationService).notifyTaskDue(member, task);
  }

  @Test
  void processDueReminders_waitsForMorningCutoffBeforeScanningTasks() {
    ReminderService beforeMorning = new ReminderServiceImpl(
        Clock.fixed(Instant.parse("2026-07-25T07:59:00Z"), ZoneOffset.UTC), eventRepo, taskRepo,
        lobbyRepo, notificationService);
    when(eventRepo.findReminderCandidates(any(), any())).thenReturn(java.util.List.of());

    beforeMorning.processDueReminders();

    verifyNoInteractions(taskRepo);
  }

  @Test
  void processDueReminders_usesCreatorForUnassignedTaskAndSkipsDoneTask() {
    var unassigned = task(null, TaskStatus.TODO);
    var done = task(member, TaskStatus.DONE);
    done.setId(56L);
    when(eventRepo.findReminderCandidates(any(), any())).thenReturn(java.util.List.of());
    when(taskRepo.findDueReminderCandidates(any())).thenReturn(java.util.List.of(unassigned, done));
    when(taskRepo.claimDueReminder(55L, 0L, LocalDate.of(2026, 7, 25))).thenReturn(1);

    reminderService.processDueReminders();

    verify(notificationService).notifyTaskDue(owner, unassigned);
    verify(taskRepo, never()).claimDueReminder(eq(56L), any(Long.class), any());
  }

  private EventEntity event(boolean shared, OffsetDateTime startAt, Integer reminderMinutes) {
    return EventEntity.builder().id(9001L).version(0L).title("Dinner").shared(shared)
        .startAt(startAt).endAt(startAt.plusHours(1)).timezone("UTC")
        .reminderMinutesBefore(reminderMinutes).owner(owner).lobby(lobby).build();
  }

  private TaskEntity task(UserEntity assignee, TaskStatus status) {
    return TaskEntity.builder().id(55L).version(0L).title("Groceries").lobby(lobby)
        .creator(owner).assignee(assignee).status(status).dueDate(LocalDate.of(2026, 7, 25)).build();
  }

  private UserEntity user(Long id, String username) {
    UserEntity user = new UserEntity();
    user.setId(id);
    user.setUsername(username);
    return user;
  }
}
