# Task 8 — Add Task Drawer

**Branch:** `feature/ui-08-add-task-drawer`

*Depends on Task 5 (opened from the lobby Tasks tab) and Task 4 (create menu).*

## Detailed description

A right-side drawer (420px, per mockup) for creating a task:

- Task title (required)
- Description textarea (see backend gap)
- **Assign to** — avatar picker of the lobby's members (selected avatar gets
  a green ring + green name label)
- Due date (date input)
- Status dropdown (TO DO / IN PROGRESS / DONE)
- "Notify assignee" toggle (see backend gap)
- Footer: Cancel / "Add Task" buttons

Opened from: "+ Add task" in the lobby Tasks tab, kanban column "+" / "+ Add
task" (Task 9), and "New Task" in the create menu (Task 4 — in that case a
lobby selector must be shown first since no lobby context exists).

## Idea of this task

Tasks are the second core object of the product. The drawer pattern (instead
of a modal) keeps the task list visible behind it, matching the mockup.

## Reference to mockup

- File: `mockups/index.html`, screen id **`add-task`** (nav tab "Add Task").
- Serve with `npx serve -p 4321 mockups/`; no deep links yet — see
  [../UI_TASKS.md](../UI_TASKS.md) for how to add them.

## Development steps

1. Build `AddTaskDrawer` (`src/components/AddTaskDrawer.tsx`) on the shadcn
   `sheet` wrapper (`side="right"`). Render it from the lobby page and from
   the create-menu store; accept optional `lobbyId` prop — when absent, show
   a lobby `select` (from `useMyLobbies`) as the first field.
2. Build `AssigneePicker`: circular member avatars from the lobby's
   `memberIds` (reuse the `useUsers(ids)` hook from Task 5); single-select,
   optional (task may be unassigned).
3. Create `useCreateTask()` mutation wrapping `createTask`; on success
   invalidate task queries (`lobbyId` and `assigneeId` keyed), close drawer.
4. Status: `TaskCreateDto` has **no status field** — tasks are created as
   TODO by the backend. If the user picks a different status, follow up the
   create with `PATCH /api/tasks/{id} { status }` (two-step, documented in
   code), or hide the status field for MVP — pick one and note it.
5. Validation: title required; due date must not be in the past (warn only).
6. Tests (MSW): drawer opens from the lobby tasks tab; submit POSTs correct
   payload; created task appears in the list; lobby selector appears when
   opened from the global create menu.

## Final / expected result

- "+ Add task" opens the drawer over the dimmed lobby view; submitting
  creates the task and it appears in the Tasks tab (and kanban) immediately.
- Drawer visually matches mockup screen `add-task`.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Create task | `POST /api/tasks` — `TaskCreateDto { title, lobbyId, assigneeId?, dueDate? }` (Bearer session identifies creator) → `TaskDto` |
| Set non-default status | `PATCH /api/tasks/{id}` — `TaskUpdateDto { status }` |
| Lobby members | `GET /api/lobbies/{id}` + `GET /api/users/{id}` |

**Backend gaps (resolved July 2026):** `POST /api/tasks` now accepts
`description`, `priority` (default `MEDIUM`), initial `status` (default
`TODO`), and `notifyAssignee` — implement all drawer fields directly
(step 4's two-step PATCH workaround is obsolete; requires Task 15). The
"Notify assignee" toggle maps to `notifyAssignee` and produces a real in-app
inbox notification (email/push delivery still pending backend work).
