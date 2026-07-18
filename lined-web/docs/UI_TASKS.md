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

The mockup is a single HTML file with 30 screens toggled by the top nav bar.
Each screen is a `<div class="screen" id="...">`. **Deep links are
supported**: open `http://localhost:4321/#<screen-id>` directly (e.g.
`/#calendar-month`); the hash also updates as you click nav tabs. Screens
exist for every task, including `create-lobby` (task 4), `calendar-month`
(task 10), `subscription` (task 14), `notifications` (task 16), and
`invites` (task 17). The July 2026 gap-analysis batch added four more:
`event-conflict` (task 19), `task-detail` (task 20), `dashboard-empty`
(task 21) and `mobile` (task 22). The product-expansion batch added six:
`language` (task 24), `loading` (task 25), `checkout` (task 26),
`lobby-chat` (task 28), `lobby-stats` (task 29) and `calendar-sync`
(task 30); task 31's reminder select lives on the existing `create-event`
screen.

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

- **Task Detail & Edit drawer** — `TaskDrawer` (renamed/refactored from
  `AddTaskDrawer` into a mode-driven `create`/`edit` component, mirroring
  `CreateEventModal`): clicking a `KanbanCard` or `TaskRow` (outside their
  checkbox/move/delete hit-targets) opens the drawer pre-filled via a new
  `useCreateMenuStore.openTaskDetail(task)` action; edit mode adds a
  read-only "Created {date} by {creator} · {lobby}" meta line and a new
  Priority select (High/Medium/Low, also added to create mode); Save
  `PATCH /api/tasks/{id}` sends only changed fields; Delete opens the
  shared `ConfirmDialog` (rendered via a `createPortal` so it isn't
  clipped by the drawer's own `Sheet` portal) and calls `DELETE
  /api/tasks/{id}`. `useUpdateTask` was generalized to a lobby-agnostic,
  fully optimistic mutation (extracted cache helpers shared with
  `useUpdateTaskStatus`) so both the drawer and the existing row-checkbox
  toggle get rollback-on-error for free.

All 18 tasks of the original plan are DONE. A gap analysis against the
mockups and the live app (July 2026) found the remaining holes now tracked
as tasks 19–23: the conflict-check endpoints are wired in `src/api/events.ts`
but never called from any UI, tasks cannot be edited after creation (and
priority can never be set from the UI), a zero-lobby account gets blank
screens with no onboarding, nothing is usable below ~1024 px, and the
dark-mode toggle shipped in Task 12 has never been audited screen-by-screen.

- **Event conflict warnings** — `ConflictBanner`, `useConflictCheck` /
  `useEventConflicts` (`src/hooks/useEvents.ts`), `useNextFreeSlotHint`
  (`src/hooks/useDashboard.ts`): `CreateEventModal` (create and edit) and
  `ReserveSlotModal` now debounce-call the previously-unused `GET
  /api/calendar/conflicts` once lobby/start/end are set, and render a
  non-blocking amber banner naming the busy lobby member and their
  conflicting event when it returns a pair; edit mode filters out the event
  being edited by id. A "Next slot when everyone is free" hint (from `GET
  /api/lobbies/{id}/free-slots`) rewrites the start/end fields with the same
  duration on click. `CreateEventModal`'s primary button swaps to "Create
  Anyway"/"Save Anyway" while a conflict is shown; `ReserveSlotModal` shows
  the banner only, per spec. The check fails open: a loading or failed
  conflicts request never blocks submission or shows a banner.

- **First-run onboarding & empty states** — `EmptyState` (`src/components/EmptyState.tsx`,
  card/inline variants with an optional icon and a button-or-`Link` action),
  `DashboardHero` (`src/components/dashboard/DashboardHero.tsx`): when
  `useMyLobbies()` and `useMyInvites()` both resolve empty, `DashboardPage`
  swaps the "My Lobbies" section for a welcome hero with the four lobby-type
  cards (each opens `CreateLobbyModal` with that type preselected via a new
  `openCreateLobby(lobbyType?)` / `lobbyTypeInitial` field on
  `useCreateMenuStore`) and a primary "+ Create your first lobby" CTA
  (opens with no type preselected); a pending invite always wins and keeps
  the normal empty "My Lobbies" text below the invites banner instead.
  Swept every other bare "nothing here" text onto the same primitive:
  `LobbyCardGrid`, `UpcomingEventsList`, `MyTasksList`, `Sidebar`'s "No
  lobbies yet", kanban's per-column "No tasks in {status}", and the lobby
  `LobbyTaskList` empty state (now with an "Invite someone" link to the
  Members tab). Added a same-pattern empty-state banner (previously
  missing entirely) above the grid when a week has zero events, in both
  the lobby `LobbyCalendarView` ("Invite someone") and the global
  `CalendarPage` ("Create event"); `WeekGrid`/`MonthGrid` themselves are
  unchanged since a blank day cell is normal even in a populated week.

- **Responsive layout (mobile & tablet)** — `useMediaQuery` (`src/hooks/`),
  `useUiStore` (`src/store/ui.ts`), `BottomTabBar`, `DayChipStrip`:
  `AppShell`/`Sidebar` gain an off-canvas drawer under `lg` (☰ trigger in
  `TopBar`, body-scroll-locked, closes on backdrop click or nav) plus a
  phone-only `BottomTabBar`; dashboard/settings/lobby pages stack to one
  column under `md`. Calendar forces a single-day view under `md` (day-chip
  strip + a floating "+ New event" button), reusing `WeekGrid`'s hour-grid
  internals via a new optional `days` prop instead of a parallel component;
  `MonthGrid` shows dots-per-day below `lg`. The kanban board's columns
  become full-width horizontal scroll-snap panes under `md` (drag-and-drop
  stays desktop-only; the move buttons now meet a 44px touch target).
  `CreateEventModal`, `CreateLobbyModal`, `ReserveSlotModal` and
  `ConfirmDialog` become edge-to-edge full-height sheets under `md`;
  `TaskDrawer` (shadcn `Sheet`) swaps `side="right"` for `side="bottom"` on
  phones via its own prop rather than editing the shadcn-owned
  `sheet.tsx`; `EventDetailPanel`/`DayAgendaPanel` (previously inline flex
  siblings next to the grid) become fixed bottom sheets under `md` and stay
  in-flow at `md` and above. Desktop (`≥lg`) is unchanged.

- **Dark mode audit & polish** — `useThemeSync` (`src/hooks/`): fixed a real
  bug where the theme-application effect lived inside `AppearanceCard`
  (Settings-page-only), so the `dark` class was never applied outside that
  page and the System `matchMedia` listener was torn down on navigating
  away; moved to a hook mounted once at the app root (`App.tsx`), which
  also now sets `color-scheme` and a `<meta name="theme-color">`. Added a
  dark token layer in `src/index.css` for every custom brand/surface/text
  token that previously had no dark value (`--color-bg`, new
  `--color-surface`/`--color-surface-hover`, `--color-input-bg`,
  `--color-text-primary/secondary/muted/light`, `--color-brand-beige*`,
  `--color-brand-green-light`), then swept `bg-white` → `bg-surface` and
  `bg-gray-50`/`bg-gray-100` → `bg-surface-hover` across ~45 files.
  Hard-coded red/amber danger/warning colours (danger zones, inline
  validation errors, the conflict-warning banner) and the
  brand-green-light/brand-green-dark tint+text pairing got `dark:` variants
  at each call site instead, since some of those same shades are also used
  on solid buttons/badges that must stay theme-invariant. See
  `docs/mockups.md`'s "Dark mode (Task 23)" section for the full token
  table. Screen-by-screen audit (auth, dashboard + bell, calendar
  week/month + event panel, lobby tabs, kanban, both settings pages,
  subscription, all modals/drawers/confirm dialogs) found and fixed the
  Danger Zone cards as the only broken-beyond-illegible screens; lobby/
  status/priority accent hues and the free-slot band opacity overlay were
  left unchanged as already legible in both themes.

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
| 19 | `feature/ui-19-event-conflict-warnings` | Conflict warnings in event/reserve modals via the unused `GET /api/calendar/conflicts`, with next-free-slot suggestion | [tasks/UI-19-event-conflict-warnings.md](tasks/UI-19-event-conflict-warnings.md) | DONE |
| 20 | `feature/ui-20-task-detail-edit` | Task detail/edit drawer (open from kanban card & task row, edit all fields incl. priority, delete) | [tasks/UI-20-task-detail-edit.md](tasks/UI-20-task-detail-edit.md) | DONE |
| 21 | `feature/ui-21-onboarding-empty-states` | First-run dashboard hero ("create your first lobby") + designed empty states everywhere | [tasks/UI-21-onboarding-empty-states.md](tasks/UI-21-onboarding-empty-states.md) | DONE |
| 22 | `feature/ui-22-responsive-layout` | Mobile/tablet responsive layout: sidebar drawer, bottom tabs, calendar day view, kanban scroll-snap, sheet modals | [tasks/UI-22-responsive-layout.md](tasks/UI-22-responsive-layout.md) | DONE |
| 23 | `feature/ui-23-dark-mode-audit` | Dark-mode token layer + screen-by-screen audit of the theme toggle shipped in Task 12 | [tasks/UI-23-dark-mode-audit.md](tasks/UI-23-dark-mode-audit.md) | DONE |
| 24 | `feature/ui-24-i18n-localization` | Localization (react-i18next): English + Ukrainian, plurals, locale dates, settings switcher | [tasks/UI-24-i18n-localization.md](tasks/UI-24-i18n-localization.md) | TODO |
| 25 | `feature/ui-25-loading-states-audit` | Skeleton system: route/section/action loading tiers, zero layout shift, no full-page spinners | [tasks/UI-25-loading-states-audit.md](tasks/UI-25-loading-states-audit.md) | TODO |
| 26 | `feature/ui-26-payment-checkout` | Payment flow: checkout modal → provider-hosted payment → return states + payment history | [tasks/UI-26-payment-checkout.md](tasks/UI-26-payment-checkout.md) | TODO |
| 27 | `feature/ui-27-dashboard-summary` | Adopt `GET /api/dashboard/summary`: one request, accurate lobby-card counts, 404 fallback | [tasks/UI-27-dashboard-summary.md](tasks/UI-27-dashboard-summary.md) | TODO |
| 28 | `feature/ui-28-lobby-chat` | Lobby Chat tab: polling message list, optimistic send, edit/delete, chat notifications | [tasks/UI-28-lobby-chat.md](tasks/UI-28-lobby-chat.md) | TODO |
| 29 | `feature/ui-29-lobby-stats` | Lobby Stats tab: time-together tiles, month picker, per-member split bars | [tasks/UI-29-lobby-stats.md](tasks/UI-29-lobby-stats.md) | TODO |
| 30 | `feature/ui-30-calendar-sync` | Calendar Sync settings: ICS feed link (copy/regenerate/revoke) + .ics import | [tasks/UI-30-calendar-sync.md](tasks/UI-30-calendar-sync.md) | TODO |
| 31 | `feature/ui-31-event-reminders` | Reminder select on event/reserve modals + EVENT_REMINDER / TASK_DUE inbox types | [tasks/UI-31-event-reminders.md](tasks/UI-31-event-reminders.md) | TODO |
| 32 | `feature/ui-32-style-foundations` | Styling foundations: semantic task/lobby badges and shared `cn()` cleanup | [tasks/UI-32-style-foundations.md](tasks/UI-32-style-foundations.md) | DONE |
| 33 | `feature/ui-33-calendar-lobby-style-cleanup` | Calendar/lobby selection styling cleanup and shared agenda event row | [tasks/UI-33-calendar-lobby-style-cleanup.md](tasks/UI-33-calendar-lobby-style-cleanup.md) | DONE |
| 34 | `feature/ui-34-feature-style-cleanup` | Feature-local conditional Tailwind cleanup across tasks, dashboard, subscription, notifications, and layout | [tasks/UI-34-feature-style-cleanup.md](tasks/UI-34-feature-style-cleanup.md) | TODO |

## Suggested order

**Task 15 first** — it aligns the API layer/types with the current backend
and every other task builds on it. Then 1–2 (auth + live sidebar), 3–4
(dashboard + create flows), 5–8 (lobby detail), 9 (kanban), 10–11
(calendar), 12–13 (settings), 16–17 (notifications + invites), 14
(subscription — lowest priority). Tasks 6/7/8 depend on 5; task 11 depends
on 3 and 10; task 14 depends on 12; tasks 16/17 depend on 15; task 18 is
blocked on the backend gap it flags (`feature/password-reset-flow` in
`backend/lined/docs/experiment-tasks.md`) and otherwise parallelisable.

**Batch 19–23 (gap analysis, July 2026):** do 20 (task edit) and 19
(conflict warnings) first — small, independent, high user value. Then 21
(onboarding/empty states). Land 22 (responsive) last: it touches most
screens and would conflict with everything else in flight. 23 (dark mode)
is independent but coordinate its file sweep with 22.

**Batch 24–31 (product expansion, July 2026):** 24 (i18n) and 25 (loading
system) first — both are sweeps that everything later inherits, so land
them before new surfaces; they conflict with 22/23 the same way those
conflict with each other (coordinate). Then 31 (reminders — smallest) and
27 (dashboard summary), which have merge-before-backend fallbacks. 26
(checkout), 28 (chat), 29 (stats), 30 (calendar sync) are independent of
each other and mock-first — order by product priority; each is blocked
from *real*-API verification on its proposal branch
(`feature/payment-checkout-api`, `feature/lobby-chat-api`,
`feature/lobby-statistics-api`, `feature/calendar-ics-integration`,
`feature/user-locale-preference`, `feature/event-reminder-scheduler`,
`feature/dashboard-summary-api` — see
`backend/lined/docs/experiment-tasks.md`).

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
