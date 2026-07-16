# Task 11 — Free-Slot Detection & Reserve Slot Modal

**Branch:** `feature/ui-11-reserve-slot`

*Depends on Tasks 3 (dashboard banner), 4 (create menu), 10 (calendar).*

## Detailed description

The signature feature: turn detected mutual free time into a plan.

1. **Reserve Slot modal** — header "Reserve Free Slot" with a green slot tag
   ("✨ Sunday 2:00 – 5:00 PM · Both free"), an info card naming the lobby
   members and slot, activity title input ("What would you like to do?"),
   start/end time inputs pre-filled from the slot, optional location,
   attendee row (lobby members, auto-included), notify toggle, and a
   "Reserve Slot ✨" submit that creates a **shared event** in the lobby.
2. **Entry points**: dashboard `FreeSlotBanner` "Plan something →" (Task 3),
   create menu "Reserve Free Slot" (Task 4), and clicking a green free-band
   in the calendar grids (global + lobby).

## Idea of this task

Lined's slogan is "where life and quality time meet" — this flow is the
product's core loop: detect a window when everyone is free, one click,
reserved. Technically it is "create event with pre-filled times", but the
framing and pre-fill quality are the feature.

## Reference to mockup

- File: `mockups/index.html`, screen id **`reserve-slot`** (nav tab
  "Reserve Slot"); free bands appear on screens **`calendar`** and
  **`lobby-calendar`**; the banner on **`dashboard`**.
- Serve with `npx serve -p 4321 mockups/`; no deep links yet — see
  [../UI_TASKS.md](../UI_TASKS.md) for how to add them.

## Development steps

1. Finalise `src/lib/freeSlots.ts` (extracted in Tasks 3/7): given a set of
   events and a time window, return candidate slots
   `{ lobbyId, start, end }`. Configurable minimum duration (default 2h)
   and waking hours (e.g. 09:00–22:00). Unit-test this module thoroughly —
   it is pure logic.
2. Optionally verify a candidate slot against the backend before offering
   it: `GET /api/calendar/user-conflict?userId=&from=&to=` per member.
3. Build `ReserveSlotModal` (`src/components/ReserveSlotModal.tsx`) taking a
   `slot` prop; when opened without a slot (from the create menu), compute
   the next available slot across the user's lobbies and show a picker if
   several.
4. Attendee row: lobby members from `useUsers(lobby.memberIds)`; read-only
   for MVP (everyone in the lobby is included — events are lobby-scoped).
5. Submit: `useCreateEvent()` with `{ title, shared: true, startAt, endAt,
   timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, lobbyId }`;
   on success close, navigate to `/calendar` with the new event selected.
6. Wire all three entry points (banner, menu item, free-band click).
7. Tests: freeSlots unit tests (gaps, overlaps, min duration, edges);
   modal pre-fill from a slot; submit POSTs a shared event.

## Final / expected result

- Clicking any free-slot surface opens the modal pre-filled with that slot;
  reserving creates a shared event visible on all calendar views and the
  dashboard.
- Visual match with mockup screen `reserve-slot`.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Detect (data source) | `GET /api/calendar/events?from=&to=` → `EventDto[]` (slots computed client-side) |
| Verify member availability | `GET /api/calendar/user-conflict?userId=&from=&to=` → `UserConflictDto` |
| Reserve | `POST /api/calendar/events` — `EventCreateDto { title, shared: true, startAt, endAt, timezone, lobbyId }` → `EventDto` |

**Backend gaps:** no server-side free-slot endpoint (client-side detection
sees only events visible to the caller), no `location` on events, no
notification delivery ("Notify" toggle non-functional — disable with
tooltip).
