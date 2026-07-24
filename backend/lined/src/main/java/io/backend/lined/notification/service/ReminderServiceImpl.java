package io.backend.lined.notification.service;

import io.backend.lined.event.domain.EventEntity;
import io.backend.lined.event.domain.EventRepository;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.task.domain.TaskEntity;
import io.backend.lined.task.domain.TaskRepository;
import io.backend.lined.task.domain.TaskStatus;
import io.backend.lined.user.domain.UserEntity;
import jakarta.transaction.Transactional;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Transactional, replica-safe implementation of reminder generation.
 *
 * <p>Each candidate is claimed through a version-aware conditional update before notifications
 * are saved in the same transaction. For example, when two Kubernetes pods see the same dinner,
 * exactly one claim succeeds and only that pod fans out the reminder to current lobby members.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ReminderServiceImpl implements ReminderService {

  static final int DEFAULT_EVENT_REMINDER_MINUTES = 30;
  static final int MAX_EVENT_REMINDER_MINUTES = 10_080;
  private static final int TASK_REMINDER_HOUR_UTC = 8;

  private final Clock clock;
  private final EventRepository eventRepo;
  private final TaskRepository taskRepo;
  private final LobbyRepository lobbyRepo;
  private final NotificationService notificationService;

  /**
   * Processes all reminder candidates using the injected UTC clock.
   *
   * <p>For example, at {@code 08:05 UTC} after a short outage, due tasks for that date are still
   * processed. Before 08:00 UTC only event reminders run; this prevents a task-due alert from
   * arriving during the night.</p>
   */
  @Override
  public void processDueReminders() {
    OffsetDateTime now = OffsetDateTime.now(clock).withOffsetSameInstant(ZoneOffset.UTC);
    processEventReminders(now);
    if (now.getHour() >= TASK_REMINDER_HOUR_UTC) {
      processTaskDueReminders(now.toLocalDate());
    }
  }

  private void processEventReminders(OffsetDateTime now) {
    eventRepo.findReminderCandidates(now, now.plusMinutes(MAX_EVENT_REMINDER_MINUTES)).stream()
        .filter(event -> isWithinReminderWindow(event, now))
        .forEach(event -> claimAndNotifyEvent(event, now));
  }

  private boolean isWithinReminderWindow(EventEntity event, OffsetDateTime now) {
    int minutes = effectiveReminderMinutes(event);
    return minutes > 0 && !event.getStartAt().isAfter(now.plusMinutes(minutes));
  }

  private int effectiveReminderMinutes(EventEntity event) {
    return event.getReminderMinutesBefore() == null ? DEFAULT_EVENT_REMINDER_MINUTES
        : event.getReminderMinutesBefore();
  }

  private void claimAndNotifyEvent(EventEntity event, OffsetDateTime now) {
    if (eventRepo.claimReminder(event.getId(), event.getVersion(), now) == 1) {
      lobbyRepo.findWithMembersById(event.getLobby().getId()).ifPresent(lobby -> {
        event.setLobby(lobby);
        reminderRecipients(event).forEach(recipient -> notificationService.notifyEventReminder(
            recipient, event));
      });
    }
  }

  private Set<UserEntity> reminderRecipients(EventEntity event) {
    Set<UserEntity> recipients = new LinkedHashSet<>();
    if (event.isShared()) {
      recipients.add(event.getLobby().getOwner());
      recipients.addAll(event.getLobby().getMembers());
    } else {
      recipients.add(event.getOwner());
    }
    return recipients;
  }

  private void processTaskDueReminders(LocalDate today) {
    taskRepo.findDueReminderCandidates(today).stream()
        .filter(task -> task.getDueDate().equals(today) && task.getStatus() != TaskStatus.DONE)
        .forEach(task -> claimAndNotifyTask(task, today));
  }

  private void claimAndNotifyTask(TaskEntity task, LocalDate today) {
    if (taskRepo.claimDueReminder(task.getId(), task.getVersion(), today) == 1) {
      lobbyRepo.findWithMembersById(task.getLobby().getId()).ifPresent(lobby -> {
        task.setLobby(lobby);
        var recipient = task.getAssignee() == null ? task.getCreator() : task.getAssignee();
        notificationService.notifyTaskDue(recipient, task);
      });
    }
  }
}
