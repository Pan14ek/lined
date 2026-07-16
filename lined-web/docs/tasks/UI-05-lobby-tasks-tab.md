# Task 5 — Lobby Detail: Header, Tabs & Tasks Tab

**Branch:** `feature/ui-05-lobby-tasks-tab`

## Detailed description

Replace the `LobbyPage` stub with the real lobby detail screen:

1. **Lobby header** — top accent border in the lobby-type colour, lobby
   avatar (emoji tile), name, overlapping member-avatar stack + "N members",
   type badge, action buttons "+ Add member" and "⚙ Settings".
2. **Tab bar** — Calendar 📅 / Tasks ✅ / Members 👥; active tab underlined
   in the lobby-type colour. Tab selection via `?tab=` query param (the stub
   already reads it; default = `tasks`).
3. **Tasks tab** — filter pill bar (All / To Do / In Progress / Done with
   counts, "Sort: Due date"), task rows (checkbox, title + description line,
   status badge, assignee avatar, due date — red when overdue/today), done
   rows dimmed + struck through, and a dashed "+ Add task" button.

Tabs Calendar and Members are stubs here — implemented in Tasks 7 and 6.

## Idea of this task

The lobby page is the core "shared space" of the product. This task builds
the frame (header + tabs) every lobby feature hangs off, plus the most-used
tab (tasks), including status toggling via checkbox.

## Reference to mockup

- File: `mockups/index.html`, screen id **`lobby`** (nav tab "Lobby: Tasks").
- Serve with `npx serve -p 4321 mockups/`; no deep links yet — see
  [../UI_TASKS.md](../UI_TASKS.md) for how to add them.

## Development steps

1. Build `LobbyHeader` (`src/components/lobby/LobbyHeader.tsx`): type colour
   helpers from `src/lib/constants.ts` (Task 2), member avatars resolved by
   fetching each member's `UserDto` (add `useUsers(ids)` hook using
   `useQueries`; cache per user id).
2. Build `LobbyTabBar` using the shadcn `tabs` wrapper; sync active tab with
   the `?tab=` search param so URLs are shareable.
3. Add `useLobbyTasks(lobbyId)` hook (`listTasks({ lobbyId })`) and
   `useUpdateTask()` / mutations with query invalidation.
4. Build `LobbyTaskList` + `TaskRow`: checkbox toggles status
   (TODO/IN_PROGRESS → DONE via `PATCH /api/tasks/{id}`; unchecking a done
   task returns it to TODO). Client-side filter pills with live counts and
   due-date sort.
5. "+ Add member" button opens the Add Member modal (Task 6 store hook);
   "⚙ Settings" navigates to `/lobbies/:id/settings`; "+ Add task" opens the
   Add Task drawer (Task 8 store hook). Wire the store actions now.
6. Loading/empty/error states (lobby not found → friendly 404 message).
7. Tests (MSW): header renders lobby + members; pills filter correctly;
   checking a row PATCHes status and moves it to Done styling.

## Final / expected result

- `/lobbies/:id` shows header, tabs, and a live task list for that lobby.
- Task status can be toggled from the checkbox; filters and counts update.
- Visual match with mockup screen `lobby` (accent colours per lobby type).
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Lobby | `GET /api/lobbies/{id}` → `LobbyDto` |
| Member profiles | `GET /api/users/{id}` per `memberIds` entry → `UserDto` |
| Task list | `GET /api/tasks?lobbyId={id}` → `TaskDto[]` |
| Toggle status | `PATCH /api/tasks/{id}` — body `TaskUpdateDto { status }` → `TaskDto` |

**Backend gap (resolved July 2026):** `TaskDto` now includes `description`
and `priority` — render the description line under the title as the mockup
shows (requires Task 15's type updates).
