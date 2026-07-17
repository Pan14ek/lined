# Task 31 — Event Reminders UI

**Branch:** `feature/ui-31-event-reminders`

*Depends on Tasks 10 (event modal) and 16 (notification inbox). Mock-first
against the proposed reminder scheduler; the smallest task in this batch.*

## Detailed description

The settings toggle "Event reminders — 30 minutes before an event" ships
today but controls a notification type that never fires. The backend
proposal adds the scheduled generator plus an optional per-event override;
this task is the thin client side.

1. **Reminder select** — `CreateEventModal` (create + edit) gains a
   "Reminder" select: None / 10 min / 30 min (default) / 1 hour / 1 day
   before, mapped to `reminderMinutesBefore` (null = default 30, 0 =
   none — follow the proposal's documented semantics) on
   `EventCreateDto`/`EventUpdateDto`; `EventDetailPanel` shows a "⏰ 30
   minutes before" row when set.
2. **Inbox rendering** — `NotificationInbox` handles the two new types:
   `EVENT_REMINDER` (⏰ icon, "starts in 30 minutes", click → calendar
   with the event selected — routing already exists for event-linked
   notifications) and `TASK_DUE` (📌 icon, "due today", click → lobby
   Tasks tab).
3. **Reserve Slot** — reserved-slot events inherit the same select
   (shared form section), so booked quality time actually pings people.

## Idea of this task

Reminders are the moment a calendar app proves useful — the plan finds
you, you don't find the plan. All heavy lifting is server-side; the UI
cost of finishing the story is one select and two inbox row types.

## Reference to mockup

- The existing **`create-event`** screen
  (`http://localhost:4321/#create-event`) now includes the "Reminder"
  select (defaulting to "30 minutes before") between Location and the
  toggles — no dedicated new screen. Inbox row styling follows the
  existing **`notifications`** screen patterns.

## Development steps

1. Types: add `reminderMinutesBefore?: number | null` to the event DTOs;
   extend MSW event handlers to persist/return it and seed a couple of
   `EVENT_REMINDER`/`TASK_DUE` notifications.
2. Shared `ReminderSelect` component used by `CreateEventModal` and
   `ReserveSlotModal`; detail-panel row.
3. `NotificationInbox`/`NotificationBell` icon + copy + routing for the
   two new types (fall back gracefully on unknown types — forward
   compatibility for whatever comes next).
4. Tests (MSW): create with "1 hour before" sends 60; edit round-trips;
   "None" sends 0; detail panel renders the row; reminder notification
   click selects the event on the calendar; task-due click lands on the
   lobby Tasks tab.

## Final / expected result

- Events (including reserved slots) carry a user-chosen reminder offset,
  and reminder/task-due notifications render and deep-link correctly in
  the inbox — against MSW until the scheduler ships.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Set offset | `POST /api/calendar/events`, `PATCH /api/calendar/events/{id}` (`reminderMinutesBefore`) |
| Receive | `GET /api/notifications/mine` (`EVENT_REMINDER`, `TASK_DUE` types) |

**Backend gap:** `feature/event-reminder-scheduler` —
`backend/lined/docs/api-proposals/event-reminder-scheduler.md`.
