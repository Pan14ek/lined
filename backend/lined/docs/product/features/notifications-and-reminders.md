# Notifications and Reminders

## Purpose and scope

Notifications give each user an in-app inbox and global/per-lobby delivery preferences. Reminders turn due tasks and upcoming events into notification records. This feature models intended delivery and read state; it does not itself implement a production external email or push provider.

## Architecture and participating classes

- [`NotificationController`](../../../src/main/java/io/backend/lined/notification/api/NotificationController.java) exposes global preferences, the inbox, and mark-read; [`LobbyNotificationPreferenceController`](../../../src/main/java/io/backend/lined/notification/api/LobbyNotificationPreferenceController.java) handles lobby overrides.
- [`NotificationServiceImpl`](../../../src/main/java/io/backend/lined/notification/service/NotificationServiceImpl.java) resolves preferences, creates records, and enforces recipient ownership.
- [`ReminderScheduler`](../../../src/main/java/io/backend/lined/notification/service/ReminderScheduler.java) invokes [`ReminderServiceImpl`](../../../src/main/java/io/backend/lined/notification/service/ReminderServiceImpl.java) to claim/record due reminders.
- `NotificationEntity`, `NotificationDeliveryEntity`, `UserNotificationPreferenceEntity`, and `LobbyNotificationPreferenceEntity` persist inbox, delivery, and preference state.

## Interactions and data flow

Task and event services ask the notification service to create assignee/member notifications when their request flags allow it. The scheduler queries due tasks/events and produces reminders according to configured offsets and user/lobby preference resolution. Reads and preference changes are caller-scoped; preference writes use ETag preconditions so clients do not silently overwrite a newer configuration.

## API behavior and references

See the [notifications API section](../../foundation/api.md#notifications), including scheduled-reminder behavior. [Spring scheduling](https://docs.spring.io/spring-framework/reference/integration/scheduling.html) explains the scheduler mechanism, while [RFC 9110 conditional requests](https://www.rfc-editor.org/rfc/rfc9110#section-13.1) explains preference-update ETags.
