# CONTEXT.md — `src/features/tasks/`

## Purpose

Tasks: the create/edit drawer, the global Kanban board (all lobbies), and
the shared status/priority model. A lobby-scoped task list also exists, but
it lives in `features/lobby/tasks/` (it's lobby UI reusing this feature's
model/lib, not the other way around).

## Structure

```
tasks/
  TaskDrawer.tsx     global "create/edit task" overlay, mounted by layout/AppShell
  kanban/            KanbanBoard, KanbanColumn, KanbanCard, KanbanFilters,
                     kanbanConstants.ts (test-id/label builders shared across them)
  model/index.ts      TaskStatus, TaskPriority, TaskDto, TaskCreateDto, TaskUpdateDto
  api/                prod.ts + dev.ts + index.ts + mockData.ts + handlers.ts
  lib/
    taskUtils.ts        STATUS_ORDER, filterTasks, groupTasksByStatus,
                       sortTasksByDueDate, isTaskOverdue, isTaskDueThisWeek
    constants.ts         TASK_STATUS_*/TASK_PRIORITY_* label/color/badge maps,
                       QUERY_KEYS
  hooks/useTasks.ts     useMyTasks, useLobbyTasks, useCreateTask, useUpdateTask,
                       useUpdateTaskStatus, useDeleteTask
  pages/TasksPage.tsx   wraps KanbanBoard
```

## API surface

`prod.ts`: `GET tasks` (filterable by `lobbyId`/`assigneeId`/`status`),
`GET tasks/mine`, `POST tasks`, `PATCH/DELETE tasks/{id}`.

`useUpdateTask`/`useUpdateTaskStatus`/`useDeleteTask` all snapshot and patch
the full `QUERY_KEYS.tasks` cache directly (see `snapshotTaskCaches`/
`patchTaskCaches`/`rollbackTaskCaches` in `hooks/useTasks.ts`) for
optimistic Kanban drag-and-drop, rather than using the shared
`useOptimisticPatchMutation` hook — that hook only handles a single cached
object, not a list.

## Depends on

- `features/lobby/members/AssigneePicker` — `TaskDrawer`'s assignee field
- `features/lobby/model` — `LobbyDto` (lobby picker in `TaskDrawer`/Kanban filters)
- `features/users/hooks/useUsers` — assignee name resolution
- `features/auth/AuthAlert`, `components/{FormField,ToggleRow,ConfirmDialog}`
  (shared, not feature-owned)

## Depended on by

- `features/lobby/tasks/{LobbyTaskList,TaskRow}.tsx` — reuse this feature's
  `model` and `lib` (status/priority maps, filters) for the lobby-scoped
  task list rather than duplicating them
- `features/dashboard/widgets/MyTasksList.tsx` — reuses `taskUtils`
- `features/layout/AppShell.tsx` — mounts `TaskDrawer` as a global overlay
- `features/calendar/lib/calendarUtils.ts` — imports the `TaskStatus` type
  for a shared due-date formatter

## Testing

`kanban/__tests__/` covers drag-and-drop (via a `DataTransfer` mock — see
`KanbanBoard.test.tsx`), filtering, and optimistic status updates. See root
`docs/TESTING.md`.

## Known gaps

- `notifyAssignee` on `TaskCreateDto` is sent but not yet reflected as a
  distinct notification type on the frontend — it maps to the generic
  `TASK_ASSIGNED` notification.
