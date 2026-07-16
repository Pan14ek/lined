# Lined Web — UI Implementation Tasks

> Generated from analysis of `lined-web/` mockups and `backend/lined/` REST API.  
> Backend base path: `http://localhost:8080/api` | Auth header: `X-User-Id: <Long>`

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| 🔴 | Not started |
| 🟡 | In progress |
| 🟢 | Done |

---

## Task Index

| # | Task | Status | Priority |
|---|------|--------|----------|
| 1 | [Sign-In / Sign-Up Pages](#1-sign-in--sign-up-pages) | 🔴 | P0 |
| 2 | [Dynamic Sidebar — Lobby List](#2-dynamic-sidebar--lobby-list) | 🔴 | P0 |
| 3 | [Calendar — Edit Event Modal](#3-calendar--edit-event-modal) | 🔴 | P0 |
| 4 | [Tasks Page — Kanban Board](#4-tasks-page--kanban-board) | 🔴 | P1 |
| 5 | [Dashboard Page](#5-dashboard-page) | 🔴 | P1 |
| 6 | [Lobby Detail Page](#6-lobby-detail-page) | 🔴 | P1 |
| 7 | [Lobby Settings Page](#7-lobby-settings-page) | 🔴 | P2 |
| 8 | [User Settings Page](#8-user-settings-page) | 🔴 | P2 |
| 9 | [Calendar — Month View](#9-calendar--month-view) | 🔴 | P2 |
| 10 | [Subscription & Plan Page](#10-subscription--plan-page) | 🔴 | P3 |

---

## 1. Sign-In / Sign-Up Pages

**Status:** 🔴 Not started  
**Priority:** P0 — blocks all authenticated flows

### Description

Replace the two stub pages (`SignInPage.tsx`, `SignUpPage.tsx`) with working forms.  
The app currently has no real auth — `auth.ts` just persists a raw `userId` number in `localStorage`.  
The backend has no session/token endpoint, so the auth MVP works by:
- **Sign-Up**: call `POST /api/users` → store returned `id` as `userId`
- **Sign-In**: call `GET /api/users/search?q=<username>` → match by username, store `id`

> Note: This is a temporary auth MVP. A real auth layer (JWT/OAuth) is out of scope here.

### Final Result

- `SignUpPage` renders a form with **username**, **email**, **password** fields; on submit calls `POST /api/users`, sets `userId` in the Zustand auth store, redirects to `/`
- `SignInPage` renders a form with **username** and **password** fields; on submit searches by username, verifies user exists, sets `userId`, redirects to `/`
- Both pages show inline validation errors (blank fields, invalid email, duplicate username from 409 response)
- Route guards: if `userId` is null, redirect any protected route to `/sign-in`
- If `userId` is set, redirect `/sign-in` and `/sign-up` to `/`

### Files to Create / Modify

| File | Action |
|------|--------|
| `src/pages/SignInPage.tsx` | Replace stub with form |
| `src/pages/SignUpPage.tsx` | Replace stub with form |
| `src/api/users.ts` | Already exists — verify `createUser()` and `searchUsers()` match DTOs |
| `src/hooks/useUsers.ts` | Create — `useCreateUser()`, `useSearchUsers()` mutations/queries |
| `src/router.tsx` | Add route guard (redirect to `/sign-in` if `userId` is null) |

### REST API

```
POST /api/users
Body: { username, email, password, roles?: string[] }
Response 201: UserDto { id, username, email, createdAt, roles, activePlan, activeUntil }
Response 409: username or email already taken

GET /api/users/search?q=<username>&page=0&size=5
Response 200: UserPageDto { content: UserSearchResultDto[], page, size, totalElements, totalPages }
```

### References

- `src/store/auth.ts` — Zustand store (`userId`, `setUserId`)
- `src/api/users.ts` — `createUser()`, `searchUsers()`
- `src/types/index.ts` — `UserCreateDto`, `UserSearchResultDto`, `UserPageDto`
- `src/router.tsx` — current route definitions

---

## 2. Dynamic Sidebar — Lobby List

**Status:** 🔴 Not started  
**Priority:** P0 — sidebar currently shows 3 hardcoded lobbies

### Description

`Sidebar.tsx` currently has three hardcoded lobby entries (`Couple`, `Family`, `Friends`) with fixed links.  
Replace with a live query to `GET /api/lobbies/mine` so the sidebar reflects the real lobbies the signed-in user belongs to.

### Final Result

- Sidebar fetches user's lobbies on mount via `useMyLobbies()` hook (already exists in `useLobbies.ts`)
- Each lobby is rendered as a nav link to `/lobbies/:id`
- Lobby type is reflected by a colour dot using the `LOBBY_TYPE_COLORS` constants
- Loading state: skeleton placeholder rows
- Empty state: "No lobbies yet" with a "Create lobby" button that opens a create-lobby modal
- Create-lobby modal: name + lobbyType fields → calls `POST /api/lobbies` → invalidates lobbies query → navigates to new lobby

### Files to Create / Modify

| File | Action |
|------|--------|
| `src/components/Sidebar.tsx` | Replace hardcoded list with `useMyLobbies()` |
| `src/components/CreateLobbyModal.tsx` | Create — form modal for `POST /api/lobbies` |
| `src/hooks/useLobbies.ts` | Add `useCreateLobby()` mutation |

### REST API

```
GET /api/lobbies/mine
Header: X-User-Id: <userId>
Response 200: LobbyDto[] [{ id, name, lobbyType, ownerId, memberIds }]

POST /api/lobbies
Header: X-User-Id: <userId>
Body: { name: string, lobbyType: "COUPLE"|"FAMILY"|"FRIENDS"|"WORK" }
Response 201: LobbyDto
```

### References

- `src/components/Sidebar.tsx` — current hardcoded list (lines ~40-65)
- `src/hooks/useLobbies.ts` — `useMyLobbies()` already implemented
- `src/lib/constants.ts` — `LOBBY_TYPE_COLORS`, `LOBBY_TYPE_LABELS`
- `src/types/index.ts` — `LobbyDto`, `LobbyCreateDto`, `LobbyType`

---

## 3. Calendar — Edit Event Modal

**Status:** 🔴 Not started  
**Priority:** P0 — there is a TODO comment in `CalendarPage.tsx:72` for this

### Description

The `EventDetailPanel` already has an **Edit** button but clicking it does nothing (`TODO: open edit modal`).  
Create an edit event modal that pre-populates with the selected event's data and calls `PATCH /api/calendar/events/{id}`.

### Final Result

- Clicking **Edit** in `EventDetailPanel` opens an edit modal pre-filled with: title, lobbyId, startAt, endAt, shared flag
- The lobby field is read-only (events cannot move between lobbies)
- On submit calls `PATCH /api/calendar/events/{id}` with only changed fields
- On success: closes modal, invalidates the events query, detail panel shows updated data
- Validation: title non-blank, endAt > startAt

### Files to Create / Modify

| File | Action |
|------|--------|
| `src/components/EditEventModal.tsx` | Create — mirrors `CreateEventModal` but for updates |
| `src/components/EventDetailPanel.tsx` | Wire Edit button to open edit modal |
| `src/pages/CalendarPage.tsx` | Add edit modal state + handler (remove TODO) |
| `src/hooks/useEvents.ts` | Add `useUpdateEvent()` mutation |

### REST API

```
PATCH /api/calendar/events/{id}
Header: X-User-Id: <userId>
Body: { title?, shared?, startAt?, endAt?, timezone? }
Response 200: EventDto
```

### References

- `src/pages/CalendarPage.tsx:72` — TODO comment
- `src/components/EventDetailPanel.tsx` — Edit button
- `src/components/CreateEventModal.tsx` — reference for modal structure
- `src/api/events.ts` — `updateEvent()` already implemented
- `src/types/index.ts` — `EventUpdateDto`, `EventDto`

---

## 4. Tasks Page — Kanban Board

**Status:** 🔴 Not started  
**Priority:** P1

### Description

Replace the stub in `TasksPage.tsx` with a Kanban board. The board should support viewing tasks across a selected lobby or all lobbies, and allow drag-to-update status (or click-to-change as a simpler fallback).

### Final Result

- Three columns: **To Do**, **In Progress**, **Done** (matching `TaskStatus` enum)
- Each column lists task cards showing: title, assignee avatar (if set), due date (if set), lobby colour badge
- Clicking a task card opens a task detail drawer/modal with: title, status, assignee, due date, lobby, creator
- Task detail has **Edit** (inline field editing) and **Delete** actions
- Top bar controls:
  - Lobby selector — filter by lobby (defaults to all lobbies the user belongs to)
  - **+ New Task** button → create-task modal
- Create-task modal fields: title (required), lobby (required, dropdown), assignee (optional, user search), due date (optional)
- Status change: drag-and-drop between columns OR a status dropdown in the card/detail view → calls `PATCH /api/tasks/{id}` with `{ status }`
- Empty column state: "No tasks here" placeholder

### Files to Create / Modify

| File | Action |
|------|--------|
| `src/pages/TasksPage.tsx` | Replace stub — render `<KanbanBoard>` |
| `src/components/KanbanBoard.tsx` | Create — three-column layout |
| `src/components/TaskCard.tsx` | Create — single task card |
| `src/components/TaskDetailDrawer.tsx` | Create — task detail side panel |
| `src/components/CreateTaskModal.tsx` | Create — form modal |
| `src/hooks/useTasks.ts` | Create — `useTasks()`, `useCreateTask()`, `useUpdateTask()`, `useDeleteTask()` |
| `src/store/tasks.ts` | Create (if needed) — selected lobby filter state |

### REST API

```
GET /api/tasks?lobbyId=<id>&status=<status>&assigneeId=<id>
Response 200: TaskDto[]

POST /api/tasks
Header: X-User-Id: <userId>
Body: { title, lobbyId, assigneeId?, dueDate? }
Response 201: TaskDto

PATCH /api/tasks/{id}
Header: X-User-Id: <userId>
Body: { status?, assigneeId?, dueDate?, title? }
Response 200: TaskDto

DELETE /api/tasks/{id}
Header: X-User-Id: <userId>
Response 204
```

### References

- `src/pages/TasksPage.tsx` — current stub
- `src/api/tasks.ts` — all CRUD functions already implemented
- `src/types/index.ts` — `TaskDto`, `TaskCreateDto`, `TaskUpdateDto`, `TaskStatus`
- `src/lib/constants.ts` — `TASK_STATUS_LABELS`, `TASK_STATUS_COLORS`
- `src/test/data.ts` — 6 mock tasks for reference data shape

---

## 5. Dashboard Page

**Status:** 🔴 Not started  
**Priority:** P1

### Description

Replace the stub in `DashboardPage.tsx` with a summary overview of the user's activity: upcoming events, open tasks, and their lobbies.

### Final Result

- **Lobbies section** — cards for each lobby the user belongs to (name, type, member count), each card links to `/lobbies/:id`
- **Upcoming events section** — next 7 days of events across all user's lobbies (sorted by startAt), each showing time, title, lobby badge; clicking opens the calendar at that day
- **My open tasks section** — tasks assigned to the current user where status is TODO or IN_PROGRESS, sorted by due date; each card links to the tasks page filtered to that lobby
- Empty states for each section with call-to-action (create lobby, add event, etc.)
- Loading skeletons while data fetches

### Files to Create / Modify

| File | Action |
|------|--------|
| `src/pages/DashboardPage.tsx` | Replace stub |
| `src/components/LobbyCard.tsx` | Create — lobby summary card |
| `src/components/UpcomingEventList.tsx` | Create — compact event list |
| `src/components/TaskSummaryList.tsx` | Create — compact task list |
| `src/hooks/useTasks.ts` | Must exist (created in Task #4) |

### REST API

```
GET /api/lobbies/mine
Header: X-User-Id: <userId>
Response 200: LobbyDto[]

GET /api/calendar/events?lobbyId=<id>&from=<now>&to=<+7days>
Header: X-User-Id: <userId>
Response 200: EventDto[]
(called once per lobby, results merged and sorted)

GET /api/tasks?assigneeId=<userId>&status=TODO
GET /api/tasks?assigneeId=<userId>&status=IN_PROGRESS
Header: X-User-Id: <userId>
Response 200: TaskDto[]
```

### References

- `src/pages/DashboardPage.tsx` — current stub
- `src/hooks/useLobbies.ts` — `useMyLobbies()`
- `src/hooks/useEvents.ts` — `useWeekEvents()`
- `src/lib/calendarUtils.ts` — date helpers

---

## 6. Lobby Detail Page

**Status:** 🔴 Not started  
**Priority:** P1

### Description

Replace the stub in `LobbyPage.tsx` with a tabbed view for a specific lobby. The page receives `:id` from the route param.

### Final Result

Three tabs:

**Tab 1 — Tasks**
- Same Kanban board as `TasksPage` but pre-filtered to this lobby's `lobbyId`
- Create task auto-fills the lobbyId

**Tab 2 — Calendar**
- Reuse the `WeekGrid` component, filtered to this lobby's events only
- Include `CreateEventModal` auto-filled with this lobbyId

**Tab 3 — Members**
- List of member user cards (avatar, username, email)
- If current user is owner: show **Remove** button per member and **Add member** button
- Add-member flow: search by username (via `GET /api/users/search`), click to add via `POST /api/lobbies/{id}/members?userId=<id>`
- Remove-member: `DELETE /api/lobbies/{id}/members/{userId}`

Lobby header (above tabs): lobby name, type badge, member count, **Settings** link (to `/lobbies/:id/settings`)

### Files to Create / Modify

| File | Action |
|------|--------|
| `src/pages/LobbyPage.tsx` | Replace stub — render header + tabs |
| `src/components/MemberList.tsx` | Create — member cards with add/remove |
| `src/components/AddMemberModal.tsx` | Create — user search + add flow |
| `src/hooks/useLobbies.ts` | Add `useAddMember()`, `useRemoveMember()` mutations |

### REST API

```
GET /api/lobbies/{id}
Response 200: LobbyDto { id, name, lobbyType, ownerId, memberIds }

GET /api/users/{id}  (called per memberId to resolve user details)
Response 200: UserDto

POST /api/lobbies/{id}/members?userId=<id>
Header: X-User-Id: <userId> (must be owner)
Response 200

DELETE /api/lobbies/{id}/members/{userId}
Header: X-User-Id: <userId> (must be owner)
Response 204

GET /api/users/search?q=<query>
Response 200: UserPageDto
```

### References

- `src/pages/LobbyPage.tsx` — current stub
- `src/hooks/useLobbies.ts` — `useLobby(id)`
- `src/api/lobbies.ts` — `addMember()`, `removeMember()`
- `src/components/ui/tabs.tsx` — shadcn tabs component (already installed)

---

## 7. Lobby Settings Page

**Status:** 🔴 Not started  
**Priority:** P2

### Description

Replace the stub in `LobbySettingsPage.tsx`. Only the lobby owner should be able to access this page; non-owners redirected back to `/lobbies/:id`.

### Final Result

- **General section**: editable lobby name field (no backend update endpoint exists yet — add a note about this gap or wire to available endpoint once added)
- **Danger zone section**: **Delete Lobby** button with a confirmation dialog — calls `DELETE /api/lobbies/{id}`, then redirects to `/` and invalidates the lobbies query
- Owner-only guard: if `userId !== lobby.ownerId`, show "Access denied" and back link

> **Gap noted**: The backend has no `PATCH /api/lobbies/{id}` endpoint for renaming. The rename field should be rendered but disabled with a tooltip "Coming soon" until the backend adds this endpoint.

### Files to Create / Modify

| File | Action |
|------|--------|
| `src/pages/LobbySettingsPage.tsx` | Replace stub |
| `src/hooks/useLobbies.ts` | Add `useDeleteLobby()` mutation |

### REST API

```
DELETE /api/lobbies/{id}
Header: X-User-Id: <userId> (must be owner)
Response 204
```

### References

- `src/pages/LobbySettingsPage.tsx` — current stub
- `src/api/lobbies.ts` — `deleteLobby()`
- `src/components/ui/dialog.tsx` — confirmation dialog

---

## 8. User Settings Page

**Status:** 🔴 Not started  
**Priority:** P2

### Description

Replace the stub in `UserSettingsPage.tsx` with a settings form for the current user's profile.

### Final Result

- **Profile section**: username, email fields pre-populated from `GET /api/users/{id}` → save via `PATCH /api/users/{id}`
- **Security section**: password change form (current password field is display-only since there's no verify-password endpoint — just send new password via `PATCH /api/users/{id}` with `{ password }`)
- **Subscription section**: show active plan name and expiry from `UserDto.activePlan` / `UserDto.activeUntil`; "Manage subscription" link to `/subscription` (Task #10)
- Success toast on save; inline error messages on validation failure (409 if username/email taken)
- **Sign out** button: clears `userId` from store and redirects to `/sign-in`

### Files to Create / Modify

| File | Action |
|------|--------|
| `src/pages/UserSettingsPage.tsx` | Replace stub |
| `src/hooks/useUsers.ts` | Add `useCurrentUser()` query, `useUpdateUser()` mutation |

### REST API

```
GET /api/users/{id}
Response 200: UserDto { id, username, email, createdAt, roles, activePlan, activeUntil }

PATCH /api/users/{id}
Body: { username?, email?, password?, roles? }
Response 200: UserDto
```

### References

- `src/pages/UserSettingsPage.tsx` — current stub
- `src/api/users.ts` — `getUser()`, `updateUser()`
- `src/store/auth.ts` — `userId`, `setUserId`
- `src/types/index.ts` — `UserDto`, `UserUpdateDto`

---

## 9. Calendar — Month View

**Status:** 🔴 Not started  
**Priority:** P2

### Description

The `CalendarTopBar` has a **Week / Month** toggle and the `calendar.ts` store tracks `viewMode: 'week' | 'month'`, but `WeekGrid` only renders the week view. Implement the month grid.

### Final Result

- When `viewMode === 'month'`, `CalendarPage` renders a `MonthGrid` component instead of `WeekGrid`
- Month grid: 5–6 week rows × 7 day columns; each cell shows the day number and up to 3 event pills (overflow shown as "+N more")
- Clicking a day navigates to week view on that week
- Clicking an event pill opens `EventDetailPanel`
- Navigation (prev/next) moves by one calendar month; "Today" resets to current month
- Events are fetched for the full month window: `from` = first day of month, `to` = last day of month (across all user's lobbies)

### Files to Create / Modify

| File | Action |
|------|--------|
| `src/components/MonthGrid.tsx` | Create — month calendar grid |
| `src/pages/CalendarPage.tsx` | Conditionally render `MonthGrid` vs `WeekGrid` |
| `src/store/calendar.ts` | Add `goToPrevMonth()`, `goToNextMonth()` actions; update navigation logic |
| `src/lib/calendarUtils.ts` | Add `getMonthStart()`, `getMonthDays()` helpers |

### REST API

```
GET /api/calendar/events?lobbyId=<id>&from=<monthStart>&to=<monthEnd>
Header: X-User-Id: <userId>
Response 200: EventDto[]
(called per lobby)
```

### References

- `src/store/calendar.ts` — `viewMode`, navigation actions
- `src/components/WeekGrid.tsx` — reference for event rendering patterns
- `src/components/CalendarTopBar.tsx` — view mode toggle
- `src/lib/calendarUtils.ts` — date helpers

---

## 10. Subscription & Plan Page

**Status:** 🔴 Not started  
**Priority:** P3

### Description

New page at `/subscription` showing the user's subscription status and available plans. Referenced from User Settings (Task #8).

### Final Result

- **Current plan section**: active plan name, price, renewal/expiry date, "Cancel" button (with confirmation) → calls `POST /api/subscriptions/{userId}/cancel-active`
- **Available plans section**: cards for each plan from `GET /api/plans`, showing name, price, duration; highlighted card if it matches the current plan; "Subscribe" button → calls `POST /api/subscriptions`
- If no active subscription: "You are on the free plan" message
- Subscription history accordion: list from `GET /api/subscriptions/{userId}/history`

### Files to Create / Modify

| File | Action |
|------|--------|
| `src/pages/SubscriptionPage.tsx` | Create — new page |
| `src/router.tsx` | Add `/subscription` route inside `AppShell` |
| `src/hooks/useSubscriptions.ts` | Create — `useActivePlan()`, `usePlans()`, `useStartSubscription()`, `useCancelSubscription()`, `useSubscriptionHistory()` |

### REST API

```
GET /api/plans
Response 200: PlanDto[] [{ id, name, priceUsd, durationDays, createdAt }]

GET /api/subscriptions/{userId}/active
Response 200: SubscriptionDto { id, userId, planId, planName, startDate, endDate, active, createdAt }

GET /api/subscriptions/{userId}/history
Response 200: SubscriptionDto[]

POST /api/subscriptions
Body: { userId, planId, startDate?, endDate?, active? }
Response 201: SubscriptionDto

POST /api/subscriptions/{userId}/cancel-active
Response 200: SubscriptionDto
```

### References

- `src/api/plans.ts` — `listPlans()`, `getPlan()`
- `src/api/subscriptions.ts` — `getActiveSubscription()`, `startSubscription()`, `cancelSubscription()`, `getSubscriptionHistory()`
- `src/types/index.ts` — `PlanDto`, `SubscriptionDto`

---

## Cross-Cutting Notes

### MSW Mock Handlers

When implementing each task, extend the MSW handlers in `src/test/handlers/` with matching mock responses before writing the component. The mock server runs in dev mode via `VITE_ENABLE_MSW=true`.

### Query Key Conventions

Use the existing `QUERY_KEYS` object in `src/lib/constants.ts` — add new keys there rather than inline strings.

### Error Handling

All mutations should:
1. Show an inline error message on 4xx responses
2. Show a generic toast on 5xx responses
3. Never swallow errors silently

### Loading States

Every data-fetching component needs a skeleton or spinner. Prefer shadcn `Skeleton` (`src/components/ui/skeleton.tsx`).

### Auth Header

All hooks that call authenticated endpoints must read `userId` from the Zustand auth store. The `ky` client in `src/api/client.ts` already injects `X-User-Id` automatically from the store.
