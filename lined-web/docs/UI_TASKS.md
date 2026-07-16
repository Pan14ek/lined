# UI Implementation Task Plan

This plan is derived from a detailed comparison of the mockups
(`mockups/index.html`, 15 screens) against the current `lined-web`
implementation and the REST API available in `backend/lined`.

**For AI agents (Claude Code, Codex, Gemini, etc.):** read
[`../AGENTS.md`](../AGENTS.md) before starting — it defines the workflow for
this table. Summary: one task per branch/PR using the branch name below; read
the linked task file fully before coding; respect dependencies; update the
Status column (`TODO` → `IN PROGRESS` → `DONE`) in the same PR; don't expand
scope beyond the task file.

## How to view the mockups

```bash
npx serve -p 4321 mockups/
# → http://localhost:4321
```

The mockup is a single HTML file with 15 screens toggled by the top nav bar.
Each screen is a `<div class="screen" id="...">`. **There is currently no
deep-linking** — you must click the nav tab with the matching label.

> **Recommended improvement:** add hash-based deep links to
> `mockups/index.html` so each task file can link straight to its screen
> (e.g. `http://localhost:4321/#calendar`). Implementation: in the inline
> `<script>`, read `location.hash` on load and call `show(hash)`, and update
> `location.hash` inside `show()`. Until then, every task file references the
> screen **id** and the nav tab label to click.

## Current implementation status (July 2026)

**Already implemented:**
- Project scaffold: Vite + React 19 + TypeScript (strict) + Tailwind v4 + shadcn + TanStack Query + Zustand + ky + MSW v2
- Full API client layer (`src/api/`) covering users, lobbies, events, tasks, plans, subscriptions, with `X-User-Id` interceptor
- TypeScript types mirroring all backend DTOs (`src/types/index.ts`)
- `AppShell` + `Sidebar` layout (sidebar uses **hardcoded** lobbies and user)
- **Global Calendar page (week view)** — `CalendarTopBar`, `WeekGrid` (with client-side free-slot bands), `EventDetailPanel`, `CreateEventModal`, delete event. Missing: month view, edit event, legend.
- Zustand stores: `auth` (persisted userId), `calendar` (view state)
- Hooks: `useMyLobbies`, `useLobby`, `useWeekEvents`, `useCreateEvent`, `useDeleteEvent`
- MSW handlers + smoke tests

**Stubs only ("coming soon" placeholders):**
SignInPage, SignUpPage, DashboardPage, LobbyPage, TasksPage,
UserSettingsPage, LobbySettingsPage.

**Not started:** Create menu dropdown, CreateLobbyModal, AddTaskDrawer,
AddMemberModal, ReserveSlotModal, kanban board, lobby header/tabs/members.

## Backend API summary

| Domain | Endpoints |
|---|---|
| Users | `POST /api/users`, `PATCH /api/users/{id}`, `GET /api/users/{id}`, `GET /api/users/search?q=`, `GET /api/users/by-role` |
| Lobbies | `POST /api/lobbies`, `GET /api/lobbies/mine`, `GET /api/lobbies/{id}`, `POST /api/lobbies/{id}/members?userId=`, `DELETE /api/lobbies/{id}/members/{userId}`, `DELETE /api/lobbies/{id}` |
| Events | `POST /api/calendar/events`, `PATCH /api/calendar/events/{id}`, `GET /api/calendar/events?from=&to=`, `DELETE /api/calendar/events/{id}`, `GET /api/calendar/conflicts`, `GET /api/calendar/user-conflict` |
| Tasks | `POST /api/tasks`, `PATCH /api/tasks/{id}`, `GET /api/tasks?lobbyId=&assigneeId=&status=`, `DELETE /api/tasks/{id}` |
| Roles / Plans / Subscriptions | admin-ish; not needed for MVP UI |

**Known backend gaps** (mockup features with no API yet — each task notes how to handle):
no login endpoint (MVP: `X-User-Id` header), no event `location` field,
no task `description`/`priority` fields, no lobby rename/update endpoint,
no pending-invites concept, no user delete endpoint, no notification-settings
endpoints, no server-side free-slot detection (computed client-side).

## Task table

| # | Branch name | Task description | Reference | Status |
|---|---|---|---|---|
| 1 | `feature/ui-01-auth-pages` | Sign In / Sign Up pages with working forms (MVP auth via user search + `X-User-Id`) | [tasks/UI-01-auth-pages.md](tasks/UI-01-auth-pages.md) | TODO |
| 2 | `feature/ui-02-sidebar-live-data` | Sidebar: real lobbies + real current user from API, "+ New" lobby entry point | [tasks/UI-02-sidebar-live-data.md](tasks/UI-02-sidebar-live-data.md) | TODO |
| 3 | `feature/ui-03-dashboard` | Dashboard page: lobby cards, upcoming events, my tasks, free-slot banner | [tasks/UI-03-dashboard.md](tasks/UI-03-dashboard.md) | TODO |
| 4 | `feature/ui-04-create-menu-lobby-modal` | "+ Create" dropdown menu and Create Lobby modal (type picker) | [tasks/UI-04-create-menu-lobby-modal.md](tasks/UI-04-create-menu-lobby-modal.md) | TODO |
| 5 | `feature/ui-05-lobby-tasks-tab` | Lobby detail page: header, tab bar, Tasks tab (filter pills, task rows) | [tasks/UI-05-lobby-tasks-tab.md](tasks/UI-05-lobby-tasks-tab.md) | TODO |
| 6 | `feature/ui-06-lobby-members` | Lobby Members tab + Add Member modal (user search, invite, remove) | [tasks/UI-06-lobby-members.md](tasks/UI-06-lobby-members.md) | TODO |
| 7 | `feature/ui-07-lobby-calendar` | Lobby Calendar tab (week grid scoped to lobby, free-slot bands) | [tasks/UI-07-lobby-calendar.md](tasks/UI-07-lobby-calendar.md) | TODO |
| 8 | `feature/ui-08-add-task-drawer` | Add Task drawer (title, assignee picker, due date, status) | [tasks/UI-08-add-task-drawer.md](tasks/UI-08-add-task-drawer.md) | TODO |
| 9 | `feature/ui-09-tasks-kanban` | Global Tasks Board: 3-column kanban with filters and status transitions | [tasks/UI-09-tasks-kanban.md](tasks/UI-09-tasks-kanban.md) | TODO |
| 10 | `feature/ui-10-calendar-enhancements` | Calendar polish: edit event, month view, legend | [tasks/UI-10-calendar-enhancements.md](tasks/UI-10-calendar-enhancements.md) | TODO |
| 11 | `feature/ui-11-reserve-slot` | Free-slot detection surfacing + Reserve Free Slot modal | [tasks/UI-11-reserve-slot.md](tasks/UI-11-reserve-slot.md) | TODO |
| 12 | `feature/ui-12-user-settings` | User Settings page: profile, notifications, appearance, danger zone | [tasks/UI-12-user-settings.md](tasks/UI-12-user-settings.md) | TODO |
| 13 | `feature/ui-13-lobby-settings` | Lobby Settings page: general, notifications, leave/delete lobby | [tasks/UI-13-lobby-settings.md](tasks/UI-13-lobby-settings.md) | TODO |

## Suggested order

Tasks 1–2 unblock everything (auth + live sidebar). Then 3–4 (dashboard +
create flows), 5–8 (lobby detail), 9 (kanban), 10–11 (calendar), 12–13
(settings). Tasks 6/7/8 depend on 5; task 11 depends on 3 and 10; everything
else is parallelisable.

## Conventions for every task

- Follow the `lined-web` rules in [`../AGENTS.md`](../AGENTS.md) (full detail
  in the root `AGENTS.md`, section "Web — Vite + React"): data fetching only
  via TanStack Query hooks in `src/hooks/`, UI state in Zustand, Tailwind
  tokens only (no hex), never edit `src/components/ui/`, MSW v2 for test
  mocking.
- Definition of done for each task: `npm run lint`, `npm run typecheck`,
  `npm test` (`npm run test:run`) and `npm run build` all pass; new
  components have tests with MSW handlers; visually verified against the
  mockup screen at 1280×800.
