# Task 3 — Dashboard Page

**Branch:** `feature/ui-03-dashboard`

## Detailed description

Replace the `DashboardPage` stub with the full dashboard from the mockup:

1. **Top bar** — "Good morning, {name} 👋" greeting with today's date,
   notification bell (placeholder), "+ Create" button.
2. **My Lobbies** — horizontal row of lobby summary cards (type accent bar,
   type badge, name, member/event/task counts) + "See all →".
3. **Upcoming Events** (left column) — next events across all lobbies:
   accent bar, title, humanised time ("Today · 5:00 PM"), lobby badge.
4. **My Tasks** (right column) — tasks assigned to the current user with
   status dot + badge (TODO / IN PROGRESS / DONE) and due date (red if today
   /overdue).
5. **Free-slot banner** — green "Free time found!" card ("You & X are both
   free Sunday 2–5 PM") with a "Plan something →" CTA (opens Reserve Slot
   modal — stub until Task 11).

## Idea of this task

The dashboard is the landing page after sign-in: a cross-lobby digest that
answers "what's next and what do I owe?" in one glance and funnels users
into the create flows.

## Reference to mockup

- File: `mockups/index.html`, screen id **`dashboard`** (nav tab
  "Dashboard"). The dimmed variant with the dropdown open is screen id
  **`dashboard-create`** (covered by Task 4).
- Serve with `npx serve -p 4321 mockups/`; no deep links yet — see
  [../UI_TASKS.md](../UI_TASKS.md) for how to add them.

## Development steps

1. Add hooks: `useUpcomingEvents()` (wrap `listEvents({ from: now, to:
   now+14d })`, sort ascending, take ~5) and `useMyTasks()` (wrap
   `listTasks({ assigneeId: currentUserId })`).
2. Build components in `src/components/dashboard/`:
   `LobbyCardGrid`, `LobbyCard`, `UpcomingEventsList`, `MyTasksList`,
   `FreeSlotBanner`, plus a small `StatusBadge` shared with later tasks.
3. Lobby card counts: member count comes from `LobbyDto.memberIds.length`;
   event/task counts require per-lobby queries — MVP: derive counts by
   grouping the already-fetched upcoming events and tasks by `lobbyId`
   (document that counts are "upcoming/open", not lifetime totals).
4. Date formatting helpers in `src/lib/calendarUtils.ts` ("Today · 5:00 PM",
   "Sun, 29 Mar · 7:00 PM", relative due dates).
5. Free-slot banner: reuse the client-side `computeFreeSlots` logic from
   `WeekGrid.tsx` — extract it into `src/lib/freeSlots.ts` first so both
   consumers share it. Show the banner only when a slot is found in the next
   7 days; hide otherwise.
6. Top-bar greeting from `useCurrentUser()`; "+ Create" wired to the create
   menu store (Task 4 provides the dropdown).
7. Empty states for each section (no lobbies / no events / no tasks).
8. Tests (MSW): sections render from mocked endpoints; task due today shows
   red; free-slot banner hidden when calendar is fully busy.

## Final / expected result

- `/` shows the full dashboard matching the mockup layout (lobby card row +
  two-column events/tasks grid + free-slot banner).
- All data is live per signed-in user; navigating from cards works
  (lobby card → `/lobbies/:id`, "View calendar →" → `/calendar`,
  "All tasks →" → `/tasks`).
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Lobbies | `GET /api/lobbies/mine` → `LobbyDto[]` |
| Upcoming events | `GET /api/calendar/events?from=&to=` → `EventDto[]` |
| My tasks | `GET /api/tasks?assigneeId={me}` → `TaskDto[]` |
| Current user | `GET /api/users/{id}` → `UserDto` |

**Backend gap (updated July 2026):** server-side free-slot detection now
exists — prefer `GET /api/lobbies/{id}/free-slots?from=&to=` over the
client-side computation for the banner (client-side stays as a fallback/for
in-grid rendering). Still no aggregate dashboard endpoint (proposal:
`backend/lined/docs/api-proposals/dashboard-summary-api.md`) — counts remain
client-derived until it lands.
