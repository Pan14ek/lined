# API Proposal — Event Reminder Scheduler

**Branch:** `feature/event-reminder-scheduler`
**Status:** Implemented
**Motivation:** README MVP list includes "Notifications (basic) — reminders
for events and tasks", and the notification preferences already expose an
`eventRemindersEnabled` toggle ("Reminders 30 minutes before an event") —
but nothing ever *generates* a reminder. The inbox currently only receives
create-time notifications (task assigned, event created).

## What the API should do

Mostly a scheduled worker plus one small read extension — not a new
client-facing surface:

1. **Reminder generation (server-side job):** a Spring `@Scheduled` job runs
   every minute, finds events starting within the reminder window
   (default 30 minutes) whose reminder has not been emitted, and creates a
   notification (type `EVENT_REMINDER`) for each relevant user through the
   existing notification pipeline — respecting the existing global
   (`eventRemindersEnabled`) and per-lobby preference gates.
   - Shared event → every current lobby member; private event → owner only.
   - Idempotence: persist `reminderSentAt` on the event (or a
     `reminder_emission` row) so restarts/multiple instances never
     double-send.
2. **Task due reminders (same mechanism):** tasks with a `dueDate` arriving
   today and status ≠ DONE get a `TASK_DUE` notification at or after 08:00
   UTC. The assignee receives it, or the creator when unassigned.
3. **Optional per-event override (client-facing):** extend
   `EventCreateDto`/`EventUpdateDto` with `reminderMinutesBefore`
   (nullable → default 30, `0` disables, maximum seven days) and return it in
   `EventDto`.

## Why it matters

- Completes the MVP notification story: the settings toggle the UI ships
  (UI-12) currently controls a notification type that can never fire.
- The inbox (`GET /api/notifications/mine`) and its `PUSH`/`EMAIL` delivery
  intents become meaningful for the most important notification type —
  when external delivery lands later, reminders are already flowing through
  the pipeline.

## Implementation notes

- Follow the existing notification emission seam (preference gate + inbox
  record + delivery intents); do not create a parallel path.
- Clock injection (`java.time.Clock`) for testability; window scan
  `[now, now + interval]` with the emitted-marker to survive missed ticks.
- Keep the job single-writer-safe (optimistic update on the marker) since
  Kubernetes runs multiple replicas in the experiment scenarios.
- Tests: window edges, preference-disabled suppression, shared vs private
  fan-out, idempotent re-run, task due-today selection.

## Definition of done

An event created 20 minutes ahead produces an `EVENT_REMINDER` inbox record
for each eligible member exactly once; preference toggles suppress it; task
due reminders fire; documented in `docs/foundation/api.md`; quality gates pass.
