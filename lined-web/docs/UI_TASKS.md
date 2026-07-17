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

The mockup is a single HTML file with 20 screens toggled by the top nav bar.
Each screen is a `<div class="screen" id="...">`. **Deep links are
supported**: open `http://localhost:4321/#<screen-id>` directly (e.g.
`/#calendar-month`); the hash also updates as you click nav tabs. Screens
exist for every task, including `create-lobby` (task 4), `calendar-month`
(task 10), `subscription` (task 14), `notifications` (task 16), and
`invites` (task 17).

## Current implementation status (July 2026)

**Already implemented:**
- Project scaffold: Vite + React 19 + TypeScript (strict) + Tailwind v4 + shadcn + TanStack Query + Zustand + ky + MSW v2
- Full API client layer (`src/api/`) covering users, lobbies, events, tasks, plans, subscriptions, with `X-User-Id` interceptor
- TypeScript types mirroring all backend DTOs (`src/types/index.ts`)
- `AppShell` + `Sidebar` layout (sidebar shows real lobbies + real current user
  from the API, with loading/empty states and sign-out)
- **Global Calendar page (week + month view)** — `CalendarTopBar`, `WeekGrid` (with client-side free-slot bands, legend, now-line), `MonthGrid` (6-week grid, day-click drills into that week), `EventDetailPanel` (with location row), `CreateEventModal` (create + edit modes), delete event.
- **"+ Create" dropdown & Create Lobby modal** — `CreateMenu`, `CreateLobbyModal`, `LobbyTypePicker`, `useCreateLobby`; New Task / Reserve Free Slot only flip store state until Tasks 8/11 land.
- Zustand stores: `auth` (persisted userId), `calendar` (view state), `createMenu` (create-lobby + event/task/reserveSlot overlay state)
- Hooks: `useMyLobbies`, `useLobby`, `useCreateLobby`, `useUpdateLobbyOwner`, `useRemoveMember`, `useWeekEvents`, `useCreateEvent`, `useDeleteEvent`, `useUsers`, `useUserSearch`, `useLobbyTasks`, `useUpdateTask`, `useLobbyInvites`, `useCreateInvite`, `useResendInvite`, `useCancelInvite`
- MSW handlers + smoke tests
- **Lobby detail page** — `LobbyHeader`, `LobbyTabBar`, `LobbyTaskList`, `TaskRow`: type-accent header with resolved member avatars, `?tab=`-synced tab bar, and a live Tasks tab (filter pills with counts, due-date sort, checkbox status toggle).
- **Lobby Members tab & Add Member modal** — `LobbyMemberList`, `MemberCard`, `PendingInviteRow`, `AddMemberModal`, shared `ConfirmDialog`: role badges, owner-only "Make owner"/"Remove" actions with confirm dialogs, owner-only Pending Invites section (resend/cancel), and debounced user search with already-member/invitable/invite-sent states.
- **Lobby Calendar tab** — `LobbyCalendarView`, `DayAgendaModal`: week grid scoped to one lobby (events filtered client-side, colored by lobby type), free-slot bands from `GET /api/lobbies/{id}/free-slots`, a simplified 2-item legend, lobby-locked event creation, and day-overflow handling (lane layout for overlapping events, a "+N more" pill past 4 visible events, click-to-open day agenda listing all events + free slots for that day). `WeekGrid` was generalised (prop-driven free slots/legend, opt-in `onDayClick`) without changing the global calendar's behaviour.
- **Add Task drawer** — `AddTaskDrawer`, `AssigneePicker`: right-side 420px sheet with title, description, assignee picker (reusable circular avatar single-select), due date (past-date warning, non-blocking), status, and notify-assignee toggle. Single-step `POST /api/tasks` create (status/description/priority/notifyAssignee all sent directly, no PATCH follow-up). Opens from the lobby Tasks tab (lobby-locked) and the global "+ Create" menu (lobby selector, since no lobby context exists there).
- **Global Tasks Board (kanban)** — `KanbanBoard`, `KanbanColumn`, `KanbanCard`, `KanbanFilters`: three status columns (To Do / In Progress / Done) built by client-side grouping of `useMyTasks()` (`GET /api/tasks/mine`), with lobby/member/date (All/Overdue/This Week) filters, priority bars, lobby tags, due dates, assignee avatars, done-card dimming/strikethrough, ←/→ status moves plus native HTML5 drag-and-drop between columns (both optimistic `PATCH`, rollback on error), and delete-with-confirm (`DELETE`). "+ New task" and column "+"/"+ Add task" open `AddTaskDrawer` with the column's status preselected via `useCreateMenuStore`.
- **Reserve Free Slot modal** — `ReserveSlotModal`: three modes resolved from an optional `ReserveSlotInitial` (lobbyId/start/end) — a full slot (dashboard banner, lobby free-band click) shows a read-only lobby/member card; a time-only slot (global-calendar free-band click, no lobby context) shows an editable lobby select; no slot (create-menu entry) computes per-lobby candidates via `useFreeSlotCandidates` and lets the user pick one. Submits a shared `POST /api/calendar/events` with `notifyMembers`; read-only attendee row (lobby members auto-included). `WeekGrid` gained an opt-in `onFreeSlotClick` to make free bands clickable.
- **User Settings page** — `SettingsMenu`, `ProfileCard`, `PasswordCard`, `NotificationsCard`, `AppearanceCard`, `DangerZoneCard`: two-pane layout with anchor-link nav; profile edits PATCH only changed fields with inline 409/generic error handling; notification toggles are backed directly by `GET/PATCH /api/notifications/preferences` (optimistic, rollback on error) since Task 16 hadn't started yet; theme (Light/Dark/System) persists to a client-only `useSettingsStore` and toggles the `dark` class; Danger Zone calls the real `DELETE /api/users/{id}`, surfacing the 409 "still owns lobbies" conflict inline.
- **Lobby Settings page** — `LobbyGeneralCard`, `LobbyNotificationsCard`, `LobbyDangerZoneCard`: reuses `LobbyHeader` + a breadcrumb (no tab bar); General card PATCHes only changed lobby name/type fields (owner-only, read-only for other members); Notifications card is backed by `GET/PATCH /api/lobbies/{lobbyId}/notification-preferences` (optimistic, rollback on error); Danger Zone offers Leave (any member, `DELETE /api/lobbies/{id}/members/{myUserId}`, friendly message on the owner-can't-leave conflict) and Delete (owner-only, `ConfirmDialog`'s new type-the-lobby-name-to-confirm mode, `DELETE /api/lobbies/{id}`). Known gap: the real backend's member-removal endpoint is currently owner-only end-to-end, so a non-owner's Leave click 403s against the live API even though the flow is fully covered by MSW mocks and tests.

- **Notifications Center** — `NotificationBell`, `NotificationInbox`: dashboard bell with a live unread-count badge (capped "9+"), dropdown inbox listing `GET /api/notifications/mine` (per-row type icon, message, relative time via new `formatRelativeTimeAgo`, lobby name, unread tint/dot), click-to-mark-read (`PATCH /api/notifications/{id}/read`) with navigation to the related lobby Tasks tab / calendar (selecting the event) / lobby page depending on which ids are set, and a "Mark all read" header action. `useMyNotifications` polls every 60s. Global/per-lobby notification preference cards (`NotificationsCard`, `LobbyNotificationsCard`) were already backend-persisted from earlier work — this task only added the inbox/bell.
- **Lobby Invites (invitee side)** — `InviteCard`, `PendingInvitesBanner`: a "Pending Invites · N" section (green-bordered cards, inviter avatar tinted by lobby-type accent, `GET /api/lobby-invites/mine`) rendered above "My Lobbies" on the dashboard; Accept (`POST /api/lobby-invites/{id}/accept`) navigates into the joined lobby, Decline goes through the shared `ConfirmDialog`, and a 409 on either (stale/already-actioned invite) shows "This invite is no longer valid" and refetches. The same `InviteCard`s now also appear at the top of the notification-bell dropdown (`NotificationInbox`), reusing the accept/decline hooks without the confirm-dialog step. New hooks: `useMyInvites`/`useAcceptInvite`/`useDeclineInvite` in `useInvites.ts` (the API client and MSW mocks already existed from Task 15). Verified `GET /api/lobbies/{id}` has no membership check server-side, so the invitee-side lobby name/type/member-count render directly instead of falling back to generic text.

- **Subscription & Plan page** — `CurrentPlanCard`, `PlanCards`,
  `SubscriptionHistoryCard`: `/subscription` route (linked from a new
  "Subscription" item in the User Settings PREFERENCES menu); current-plan
  card shows plan/price/renewal date with a confirm-gated "Cancel
  subscription" (`POST /api/subscriptions/{userId}/cancel-active`) or a
  free-plan message when `GET /api/subscriptions/{userId}/active` 404s;
  plan cards from `GET /api/plans` highlight the active plan and
  "Subscribe" others (`POST /api/subscriptions`, inline 409 message when
  already subscribed); history card lists `GET
  /api/subscriptions/{userId}/history` with ACTIVE/ENDED badges. New
  `useSubscriptions.ts` hooks (`usePlans`, `useActivePlan`,
  `useSubscriptionHistory`, `useStartSubscription`,
  `useCancelSubscription`).

- **Forgot Password flow** — `ForgotPasswordPage`, `ResetPasswordPage`:
  `/forgot-password` (identifier form, always shows a neutral "we've sent a
  link" message regardless of match, avoiding account enumeration) and
  `/reset-password?token=...` (new-password + confirm fields reusing
  `SignUpPage`'s validation; missing token shows an `AuthAlert` before any
  form renders; a rejected token shows the same alert with a link back to
  `/forgot-password`; success redirects to `/sign-in?reset=success`, which
  shows a new `AuthAlert` `success` variant). **Mock-only MVP:** the backend
  has no password-reset endpoints yet (`POST /api/auth/password-reset-requests`,
  `POST /api/auth/password-resets` — see `backend/lined/docs/experiment-tasks.md`,
  `feature/password-reset-flow`); this flow is only exercised against MSW
  and cannot be verified against the real API until that gap ships.
  `SignInPage`'s "Forgot password?" text is now a real `<Link>`.

**Stubs only ("coming soon" placeholders):**
SignInPage, SignUpPage, DashboardPage.

## Backend API summary

| Domain | Endpoints |
|---|---|
| Auth | `POST /api/auth/login` (identifier = email or username; returns token + user identity) |
| Users | `POST /api/users`, `PATCH /api/users/{id}`, `GET /api/users/{id}`, `DELETE /api/users/{id}` (self), `GET /api/users/search?q=`, `GET /api/users/by-role` |
| Lobbies | `POST /api/lobbies`, `GET /api/lobbies/mine`, `GET /api/lobbies/{id}`, `PATCH /api/lobbies/{id}` (name/type/ownerId, owner-only), `DELETE /api/lobbies/{id}/members/{userId}`, `DELETE /api/lobbies/{id}`, `GET /api/lobbies/{id}/free-slots?from=&to=` |
| Lobby invites | `POST /api/lobbies/{lobbyId}/invites?userId=` or `?userEmail=`, `GET /api/lobbies/{lobbyId}/invites`, `POST …/invites/{inviteId}/resend`, `DELETE …/invites/{inviteId}`, `GET /api/lobby-invites/mine`, `POST /api/lobby-invites/{inviteId}/accept`, `POST /api/lobby-invites/{inviteId}/decline` |
| Events | `POST /api/calendar/events` (incl. `location`, `notifyMembers`), `PATCH /api/calendar/events/{id}`, `GET /api/calendar/events?from=&to=`, `DELETE /api/calendar/events/{id}`, `GET /api/calendar/conflicts`, `GET /api/calendar/user-conflict` |
| Tasks | `POST /api/tasks` (incl. `description`, `priority`, `status`, `notifyAssignee`), `PATCH /api/tasks/{id}`, `GET /api/tasks?lobbyId=&assigneeId=&status=`, `GET /api/tasks/mine`, `DELETE /api/tasks/{id}` |
| Notifications | `GET/PATCH /api/notifications/preferences`, `GET/PATCH /api/lobbies/{lobbyId}/notification-preferences`, `GET /api/notifications/mine`, `PATCH /api/notifications/{id}/read` |
| Plans / Subscriptions | `GET /api/plans`, `POST /api/subscriptions`, `POST /api/subscriptions/{userId}/cancel-active`, `GET /api/subscriptions/{userId}/active`, `GET /api/subscriptions/{userId}/history` |

> **Contract update (July 2026):** all nine backend gaps originally flagged by
> this plan are now implemented on `main` (see `backend/lined/docs/api.md`).
> **Breaking change:** `POST /api/lobbies/{id}/members` was removed — members
> join via the invite flow. Task 15 migrates the client API layer; where an
> older task file mentions a "backend gap", the per-file update note wins.
> Still missing/planned: `GET /api/users/me`, external email/push delivery,
> avatar upload, display-name field (see
> `backend/lined/docs/experiment-tasks.md`, Domain "Backend API gap").

## Task table

| # | Branch name | Task description | Reference | Status |
|---|---|---|---|---|
| 1 | `feature/ui-01-auth-pages` | Sign In / Sign Up pages with working forms (MVP auth via user search + `X-User-Id`) | [tasks/UI-01-auth-pages.md](tasks/UI-01-auth-pages.md) | DONE |
| 2 | `feature/ui-02-sidebar-live-data` | Sidebar: real lobbies + real current user from API, "+ New" lobby entry point | [tasks/UI-02-sidebar-live-data.md](tasks/UI-02-sidebar-live-data.md) | DONE |
| 3 | `feature/ui-03-dashboard` | Dashboard page: lobby cards, upcoming events, my tasks, free-slot banner | [tasks/UI-03-dashboard.md](tasks/UI-03-dashboard.md) | DONE |
| 4 | `feature/ui-04-create-menu-lobby-modal` | "+ Create" dropdown menu and Create Lobby modal (type picker) | [tasks/UI-04-create-menu-lobby-modal.md](tasks/UI-04-create-menu-lobby-modal.md) | DONE |
| 5 | `feature/ui-05-lobby-tasks-tab` | Lobby detail page: header, tab bar, Tasks tab (filter pills, task rows) | [tasks/UI-05-lobby-tasks-tab.md](tasks/UI-05-lobby-tasks-tab.md) | DONE |
| 6 | `feature/ui-06-lobby-members` | Lobby Members tab + Add Member modal (user search, invite, remove) | [tasks/UI-06-lobby-members.md](tasks/UI-06-lobby-members.md) | DONE |
| 7 | `feature/ui-07-lobby-calendar` | Lobby Calendar tab (week grid scoped to lobby, free-slot bands) | [tasks/UI-07-lobby-calendar.md](tasks/UI-07-lobby-calendar.md) | DONE |
| 8 | `feature/ui-08-add-task-drawer` | Add Task drawer (title, assignee picker, due date, status) | [tasks/UI-08-add-task-drawer.md](tasks/UI-08-add-task-drawer.md) | DONE |
| 9 | `feature/ui-09-tasks-kanban` | Global Tasks Board: 3-column kanban with filters and status transitions | [tasks/UI-09-tasks-kanban.md](tasks/UI-09-tasks-kanban.md) | DONE |
| 10 | `feature/ui-10-calendar-enhancements` | Calendar polish: edit event, month view, legend | [tasks/UI-10-calendar-enhancements.md](tasks/UI-10-calendar-enhancements.md) | DONE |
| 11 | `feature/ui-11-reserve-slot` | Free-slot detection surfacing + Reserve Free Slot modal | [tasks/UI-11-reserve-slot.md](tasks/UI-11-reserve-slot.md) | DONE |
| 12 | `feature/ui-12-user-settings` | User Settings page: profile, notifications, appearance, danger zone | [tasks/UI-12-user-settings.md](tasks/UI-12-user-settings.md) | DONE |
| 13 | `feature/ui-13-lobby-settings` | Lobby Settings page: general, notifications, leave/delete lobby | [tasks/UI-13-lobby-settings.md](tasks/UI-13-lobby-settings.md) | DONE |
| 14 | `feature/ui-14-subscription-page` | Subscription & Plan page: current plan, available plans, subscribe/cancel, history | [tasks/UI-14-subscription-page.md](tasks/UI-14-subscription-page.md) | DONE |
| 15 | `feature/ui-15-api-contract-refresh` | Migrate `src/api`/`src/types`/MSW to the July 2026 backend contract (login, invites, new task/event fields, tasks/mine, free-slots, notifications) | [tasks/UI-15-api-contract-refresh.md](tasks/UI-15-api-contract-refresh.md) | DONE |
| 16 | `feature/ui-16-notifications-center` | Notification bell + inbox (unread count, mark read) and backend-persisted notification preferences | [tasks/UI-16-notifications-center.md](tasks/UI-16-notifications-center.md) | DONE |
| 17 | `feature/ui-17-lobby-invites-inbox` | Invitee-side invites: pending invites list, accept/decline flows | [tasks/UI-17-lobby-invites-inbox.md](tasks/UI-17-lobby-invites-inbox.md) | DONE |
| 18 | `feature/ui-18-forgot-password` | Forgot password flow: request form, token redemption, new-password form | [tasks/UI-18-forgot-password.md](tasks/UI-18-forgot-password.md) | DONE |

## Suggested order

**Task 15 first** — it aligns the API layer/types with the current backend
and every other task builds on it. Then 1–2 (auth + live sidebar), 3–4
(dashboard + create flows), 5–8 (lobby detail), 9 (kanban), 10–11
(calendar), 12–13 (settings), 16–17 (notifications + invites), 14
(subscription — lowest priority). Tasks 6/7/8 depend on 5; task 11 depends
on 3 and 10; task 14 depends on 12; tasks 16/17 depend on 15; task 18 is
blocked on the backend gap it flags (`feature/password-reset-flow` in
`backend/lined/docs/experiment-tasks.md`) and otherwise parallelisable.

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
- **MSW first:** extend the handlers in `src/test/handlers/` with matching
  mock responses before writing the component (mock server runs in dev via
  `VITE_ENABLE_MSW=true`).
- **Query keys:** add new keys to the `QUERY_KEYS` object in
  `src/lib/constants.ts` — never inline query-key strings.
- **Error handling:** mutations show an inline error on 4xx, a generic toast
  on 5xx, and never swallow errors silently.
- **Loading states:** every data-fetching component needs a skeleton or
  spinner — prefer shadcn `Skeleton` (`src/components/ui/skeleton.tsx`).
