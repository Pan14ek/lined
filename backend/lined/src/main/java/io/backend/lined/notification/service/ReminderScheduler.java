package io.backend.lined.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Triggers reminder processing once per minute.
 *
 * <p>For example, a 17:30 scheduler invocation makes a 17:55 event with the default lead time
 * eligible, while the service's atomic claim prevents another pod's same-minute invocation from
 * duplicating the inbox reminder.</p>
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "lined.reminders.scheduling.enabled", havingValue = "true",
    matchIfMissing = true)
public class ReminderScheduler {

  private final ReminderService reminderService;

  /**
   * Delegates one scheduler tick to transactional reminder processing.
   *
   * <p>The cron expression has second precision and therefore runs at {@code :00} of every minute.
   * It contains no notification logic so tests can invoke the service directly with a fixed clock.</p>
   */
  @Scheduled(cron = "0 * * * * *")
  public void emitDueReminders() {
    reminderService.processDueReminders();
  }
}
