package io.backend.lined.notification.service;

/**
 * Processes due event and task reminder occurrences.
 *
 * <p>The scheduler calls this boundary once per minute. For example, at {@code 08:00 UTC} it
 * claims today's unfinished grocery task before sending one {@code TASK_DUE} inbox entry, and it
 * claims an event beginning within its configured lead time before sending {@code EVENT_REMINDER}
 * entries.</p>
 */
public interface ReminderService {

  /**
   * Finds, atomically claims, and emits all reminder occurrences eligible at the current clock.
   *
   * <p>Repeated calls are safe: a claimed event or due-date task is skipped on later runs, even
   * when another application replica runs at the same minute.</p>
   */
  void processDueReminders();
}
