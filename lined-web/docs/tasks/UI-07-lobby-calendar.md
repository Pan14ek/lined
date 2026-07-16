# Task 7 — Lobby Calendar Tab

**Branch:** `feature/ui-07-lobby-calendar`

*Depends on Task 5 (lobby page frame). Reuses the global calendar components.*

## Detailed description

Implement the Calendar tab of the lobby detail page: the same week time-grid
as the global calendar, but **scoped to a single lobby** — only that lobby's
events (coloured by the lobby type), plus green "✨ Both free" bands where
all lobby members are simultaneously free. Includes the calendar top bar
(month nav, Today, Week/Month toggle, "+ New event") and a simplified legend
("Shared event", "Free slot (both available)").

## Idea of this task

Couples/families want one view answering "when are we both free?". The
existing `WeekGrid` (`src/components/WeekGrid.tsx`, 281 lines) already
renders events and computes free-slot bands client-side — this task
generalises it for lobby scoping instead of rebuilding it.

## Reference to mockup

- File: `mockups/index.html`, screen id **`lobby-calendar`** (nav tab
  "Lobby: Calendar").
- Serve with `npx serve -p 4321 mockups/`; no deep links yet — see
  [../UI_TASKS.md](../UI_TASKS.md) for how to add them.

## Development steps

1. Refactor `WeekGrid` so event filtering and colouring are prop-driven
   (accept an optional `lobbyId` filter or pre-filtered events + a
   `colorFor(event)` callback). Keep the global CalendarPage behaviour
   unchanged (regression-check its tests).
2. Extract free-slot computation to `src/lib/freeSlots.ts` (shared with
   Task 3/11) and make it operate on "all members' events". Note: the
   backend `GET /api/calendar/events` returns events visible to the caller;
   true availability of *other* members depends on their own calendars —
   MVP computes free slots from the events the caller can see and documents
   the limitation. Alternative: probe availability windows per member via
   `GET /api/calendar/user-conflict?userId=&from=&to=` for candidate slots.
3. Build `LobbyCalendarView` for the tab: its own week-navigation state
   (reuse `useCalendarStore` or a local reducer — keep global calendar state
   separate), lobby-scoped `useWeekEvents` variant
   (`useLobbyWeekEvents(lobbyId, weekStart)` filtering by `event.lobbyId`).
4. "+ New event" opens the existing `CreateEventModal` with the lobby
   preselected and locked.
5. Clicking an event opens the existing `EventDetailPanel`.
6. Legend row per the mockup.
7. Tests (MSW): only this lobby's events render; free band appears for a
   gap; create-event defaults to the lobby.

## Final / expected result

- `/lobbies/:id?tab=calendar` shows a week grid with only that lobby's
  events in the lobby colour, free-slot bands, working navigation, event
  detail panel, and lobby-locked event creation.
- Global `/calendar` behaviour unchanged.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Week events | `GET /api/calendar/events?from=&to=` → `EventDto[]` (filter client-side by `lobbyId`) |
| Availability probe (optional) | `GET /api/calendar/user-conflict?userId=&from=&to=` → `UserConflictDto` |
| Create event | `POST /api/calendar/events` — `EventCreateDto { title, shared, startAt, endAt, timezone, lobbyId }` |
| Delete event | `DELETE /api/calendar/events/{id}` |

**Backend gap:** no "free slots for lobby" endpoint and no per-lobby events
query parameter — both handled client-side for MVP.
