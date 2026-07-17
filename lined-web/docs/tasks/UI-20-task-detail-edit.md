# Task 20 — Task Detail & Edit Drawer

**Branch:** `feature/ui-20-task-detail-edit`

*Depends on Tasks 8 (Add Task drawer) and 9 (kanban). No backend work
needed.*

## Detailed description

Today a task is write-once: after creation the only mutations the UI offers
are status changes (checkbox / kanban moves) and delete. A typo in the
title, a changed due date, or reassigning to the other person all require
delete-and-recreate.

1. **Open detail** — clicking a `KanbanCard` (Tasks board) or a `TaskRow`
   (lobby Tasks tab) opens a right-side drawer with the task loaded. The
   existing checkbox / drag / arrow interactions keep working unchanged —
   only clicks outside those hit-targets open the drawer.
2. **Edit everything** — title, description, assignee (reuse
   `AssigneePicker`), due date, priority (new High/Medium/Low select — the
   API field exists and kanban already renders priority bars, but nothing
   lets the user set it after creation), status. Header shows read-only
   meta: created date, creator, lobby.
3. **Save** — `PATCH /api/tasks/{id}` with **only the changed fields**
   (same changed-fields discipline as `ProfileCard`), optimistic update of
   both `tasks/mine` and the lobby task list, rollback + inline error on
   failure.
4. **Delete** — a Delete button in the drawer footer behind the shared
   `ConfirmDialog`, replacing the kanban-only delete path as the primary
   way to remove a task.

## Idea of this task

Editing is the difference between a demo and a tool people rely on.
Everything needed (`PATCH /api/tasks/{id}`, the drawer UI, the picker)
already exists — this task composes them into an edit surface.

## Reference to mockup

- New screen id **`task-detail`** (`http://localhost:4321/#task-detail`):
  "Task details" drawer over the lobby Tasks tab — pre-filled fields,
  created-by meta line under the title, due date + priority side by side,
  and a Delete / Cancel / Save changes footer.

## Development steps

1. Refactor `AddTaskDrawer` into a mode-driven `TaskDrawer` (`create` |
   `edit`), or extract the shared form body — mirror how
   `CreateEventModal` handles its create/edit modes. Extend
   `useCreateMenuStore` with an `openTaskDetail(task)` action.
2. Add the Priority select (`HIGH` / `MEDIUM` / `LOW`) to the form in both
   modes.
3. `useUpdateTask` already exists — verify it invalidates both
   `tasks/mine` and per-lobby task queries; extend if needed.
4. Make `KanbanCard` and `TaskRow` clickable (excluding checkbox, arrows,
   drag handles and delete button hit-targets) to open the drawer.
5. Tests (MSW): card click opens a pre-filled drawer; saving with only the
   title changed PATCHes only `{title}`; assignee/priority/due-date edits
   round-trip; delete from the drawer confirms then removes the task; a
   409/4xx on save shows an inline error and keeps the drawer open.

## Final / expected result

- Any task can be opened from the board or the lobby list and fully edited
  (including priority) or deleted, with optimistic UI and rollback.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Update fields | `PATCH /api/tasks/{id}` (title, description, assigneeId, dueDate, priority, status) |
| Delete | `DELETE /api/tasks/{id}` |
| Refresh lists | `GET /api/tasks/mine`, `GET /api/tasks?lobbyId=` |
