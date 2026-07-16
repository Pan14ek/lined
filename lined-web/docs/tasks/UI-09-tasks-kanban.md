# Task 9 — Global Tasks Board (Kanban)

**Branch:** `feature/ui-09-tasks-kanban`

## Detailed description

Replace the `TasksPage` stub with the mockup's kanban board:

- **Top bar**: "All Tasks" title, filter buttons (All Lobbies / All Members /
  All Dates), "+ New task" button.
- **Three columns** — To Do (slate), In Progress (blue), Done (green) — each
  with a coloured dot, title, count badge, "+" quick-add, card stack, and a
  dashed "+ Add task" footer.
- **Cards**: left priority bar (see gap), title, coloured lobby tag,
  due date ("Due: Today", red when overdue), assignee avatar. Done cards are
  dimmed, struck through, with a green ✓ badge.
- Moving a task between columns updates its status (buttons/menu on the
  card at minimum; drag-and-drop optional stretch).

## Idea of this task

A cross-lobby work overview: everything the household/team has to do, in one
board, filterable by lobby and member — complementing the per-lobby task list
of Task 5.

## Reference to mockup

- File: `mockups/index.html`, screen id **`tasks`** (nav tab "Tasks Board").
- Serve with `npx serve -p 4321 mockups/`; no deep links yet — see
  [../UI_TASKS.md](../UI_TASKS.md) for how to add them.

## Development steps

1. Add `useAllMyTasks()`: the backend list endpoint filters by
   `lobbyId`/`assigneeId`/`status`, but there is no "all tasks in all my
   lobbies" call — fetch `useMyLobbies()` then `useQueries` of
   `listTasks({ lobbyId })` per lobby and merge (document N+1; propose a
   backend `GET /api/tasks/mine` follow-up).
2. Build `KanbanBoard`, `KanbanColumn`, `KanbanCard` under
   `src/components/tasks/`. Group client-side by `status`.
3. Card colours: lobby tag colour from the shared `LOBBY_TYPE_COLOR` helper;
   due-date formatting/overdue logic from `calendarUtils`.
4. Status transitions: card context menu (or ← / → buttons) calling
   `PATCH /api/tasks/{id} { status }` with optimistic column move.
   Drag-and-drop only if time allows — do not add a DnD library without
   discussing bundle impact.
5. Filters: dropdowns populated from lobbies and members
   (all users across my lobbies); date filter = All / Overdue / This week.
   Pure client-side filtering of the merged list.
6. "+ New task" and column "+" open `AddTaskDrawer` (Task 8), with status
   preselected per column where possible.
7. Delete task available from the card menu (`DELETE /api/tasks/{id}`)
   with confirm.
8. Tests (MSW): tasks group into correct columns with counts; moving a card
   PATCHes status; filters narrow the board; done cards render dimmed.

## Final / expected result

- `/tasks` shows a live three-column board of all tasks across the user's
  lobbies, filterable, with working status transitions and task creation.
- Visual match with mockup screen `tasks`.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Tasks per lobby | `GET /api/tasks?lobbyId={id}` → `TaskDto[]` (merged client-side) |
| Move card | `PATCH /api/tasks/{id}` — `TaskUpdateDto { status }` → `TaskDto` |
| Delete | `DELETE /api/tasks/{id}` |
| Lobbies / members | `GET /api/lobbies/mine`, `GET /api/users/{id}` |

**Backend gaps (resolved July 2026):** `GET /api/tasks/mine` now returns all
tasks across the caller's lobbies — replace step 1's per-lobby `useQueries`
fan-out with one `useAllMyTasks()` query (filters stay client-side, as the
endpoint intends). Tasks also carry `priority` (`HIGH`/`MEDIUM`/`LOW`) —
render the mockup's priority bars (red/orange/green). Both require Task 15.
