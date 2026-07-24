# Task 52 — Private Tasks

**Branch:** `feature/ui-52-private-tasks`

*Depends on Task BE PE-BE-03 (private tasks backend, ships `visibility` and
the self-assignment invariant on `TaskDto`). Independent of Task 51 — can
land in parallel. No mockup screen exists for this feature.*

## Detailed description

Add the same visibility control used in Task 51 to the task form
(`AddTaskDrawer`), with task-specific behavior from
`backend/lined/docs/private-events-and-tasks-system-design.md` §17.2 and
§17.4: selecting `PRIVATE` locks the assignee to the current user and hides
or disables "Notify assignee"; the lobby selection stays available since
the lobby remains the task's context (§7.3-equivalent for tasks, §9.2). The
Kanban board and lobby Tasks tab must never render another member's private
task.

## Idea of this task

A private task is meaningless if it can still be assigned to (and
therefore visible-by-necessity to) someone else — the backend already
rejects that combination (PE-BE-03), so the UI's job is to make the correct
choice the *only* choice the form presents, rather than letting a user pick
an invalid combination and see a 400. Locking the assignee picker and
hiding the notify toggle up front is cheaper for the user than a
server-side rejection.

## Development steps

1. Extend task types in `src/types/index.ts` with `visibility: "PRIVATE" |
   "SHARED"`.
2. Add MSW handlers/fixtures for private tasks: owner fixture sees it
   normally in `useLobbyTasks`/`useMyTasks`; non-owner fixture never
   receives it in either list, and detail fetch 404s.
3. Add the `Visibility` toggle to `AddTaskDrawer`, defaulting to `SHARED`.
   When `PRIVATE` is selected:
   - set/lock the `AssigneePicker` to the current user (disable the
     control, don't just pre-select it — per §17.2 "disable the assignee
     picker");
   - hide or disable "Notify assignee";
   - show inline copy: "Only you can see this task."
   - keep the lobby selector enabled/visible (task stays lobby-scoped).
4. If a user switches a `PRIVATE` task back to `SHARED` in the same form
   session (before the assignee lock takes effect), re-enable the assignee
   picker.
5. Kanban board (`KanbanCard`) and lobby `TaskRow`: for the owner, prefix
   the task title with an accessible lock icon (same pattern as Task 51)
   when `visibility === "PRIVATE"`. For any task absent from the API
   response (another member's private task), render nothing — no card, no
   count contribution in column headers/filter pills, no search result.
6. Verify `useMyTasks` / `useLobbyTasks` consumers (Kanban filters,
   due-date sort, lobby Tasks tab counts) derive counts from the
   already-filtered API response rather than any client-side re-fetch of
   "all" tasks — the backend fix in PE-BE-03 only helps if the UI doesn't
   reintroduce a broader query elsewhere.
7. i18n + accessibility for all new copy and the lock icon.
8. Tests, then `npm run lint && npm run typecheck && npm test && npm run
   build`.

## Final / expected result

- New tasks default to `SHARED`.
- Selecting `PRIVATE` locks the assignee to the current user (picker
  disabled) and removes "Notify assignee" from the form.
- Kanban board and lobby Tasks tab show a lock badge on the owner's own
  private tasks and nothing at all for another member's private tasks —
  no card, no column-count contribution, no search hit.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all
  pass.

## Tests to add

- **Component — task form**: default `SHARED`; selecting `PRIVATE` disables
  the assignee picker (locked to current user) and removes/disables
  "Notify assignee"; switching back to `SHARED` re-enables the picker.
- **Component — Kanban/lobby task row**: owner view shows the lock icon
  with accessible label; a non-owner fixture renders no card and the
  column's task count excludes it.
- **Integration — MSW**: private-task fixtures for owner vs. non-owner;
  `useMyTasks`/`useLobbyTasks` never surface another creator's private
  task; direct detail fetch for a non-owner 404s and renders the normal
  not-found state.

## Risk & follow-ups

- Do not add a private-task assignee override UI even behind a flag — the
  backend rejects it outright (PE-BE-03) and the design explicitly scopes
  private tasks to self-assignment only for V1.
