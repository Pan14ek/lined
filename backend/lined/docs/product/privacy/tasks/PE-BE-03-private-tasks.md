# Task PE-BE-03 — Private Tasks Backend

**Branch:** `feature/private-tasks`

*Depends on PE-BE-02 (event visibility model). Reuses the same
enum + access-policy + repository-filtering pattern for the task domain.*

## Detailed description

`TaskEntity` currently has no visibility concept at all — every task in a
lobby is implicitly shared, and `GET /api/tasks/mine` has no
requester-aware privacy filter. This task adds `TaskVisibility { PRIVATE,
SHARED }`, a `TaskAccessPolicy`, the self-assignment invariant for private
tasks, and fixes `/mine` semantics so a private task is never returned to
anyone but its creator.

## Design references

- §7.4 Private tasks are self-owned
- §8.2 Task access matrix
- §9.2–9.3 Task entity target model + invariants
- §10.1 Task schema (`visibility` column, default `SHARED`, no legacy field)
- §11.3 `TaskAccessPolicy`
- §11.6 Task repository methods (`findVisibleByLobby`, `findVisibleMine`,
  `findVisibleById`)
- §12.4–12.5 Task create/update REST semantics
- §13 Error model (`private-task-assignee-invalid`)

## Idea of this task

A private task must never be assignable to someone other than its creator —
otherwise "private" would just mean "hidden from everyone except the person
who has to do it," which defeats the surprise-preparation use case (§2.2).
Enforcing self-assignment at creation *and* at the shared→private
transition (§12.5) is what makes the invariant hold for the lifetime of the
task, not just at creation time.

## Development steps

1. Add `task/domain/TaskVisibility.java`: `PRIVATE`, `SHARED`.
2. Schema: `tasks` has no legacy boolean, so this is a single-step add:
   ```sql
   ALTER TABLE tasks ADD COLUMN visibility VARCHAR(16) NOT NULL DEFAULT 'SHARED';
   ALTER TABLE tasks ADD CONSTRAINT chk_tasks_visibility CHECK (visibility IN ('PRIVATE', 'SHARED'));
   ```
3. Add `visibility` to `TaskEntity` (`@Enumerated(EnumType.STRING)`,
   `nullable = false, length = 16`).
4. Add `task/service/TaskAccessPolicy` mirroring `EventAccessPolicy` from
   PE-BE-02: `ensureCanRead`, `ensureCanMutate`, `ensureCanChangeVisibility`,
   `isVisibleTo`. `PRIVATE` + non-creator → `NotFoundException`; visibility
   change by non-creator → `403`.
5. Creation normalization in the task service (§12.4):
   - `visibility == PRIVATE` + `assigneeId` omitted → assignee becomes
     creator.
   - `visibility == PRIVATE` + `assigneeId == creatorId` → accepted.
   - `visibility == PRIVATE` + `assigneeId` is another user → reject with
     `400`, error code `private_task.assignee_invalid`.
   - `visibility == PRIVATE` + `notifyAssignee == true` → reject with `400`
     (reuse `private_item.notification_invalid` from PE-BE-02, same error
     shape, task-scoped).
6. Update transition rule (§12.5): if a `SHARED` task currently assigned to
   someone other than the creator receives a `PATCH` with
   `visibility: PRIVATE` and no explicit `assigneeId` reassignment to the
   creator in the *same request*, reject with `400`.
7. Repository: `findVisibleByLobby(lobbyId, requesterId, filters)`,
   `findVisibleMine(requesterId, filters)`, `findVisibleById(taskId,
   requesterId)` using the predicate `visibility = 'SHARED' OR creator_id =
   :requesterId`.
8. Fix `GET /api/tasks/mine` semantics to: shared tasks assigned to the
   requester **+** private tasks created by the requester (§11.6) — replace
   any broader existing query that would leak another creator's private
   task.
9. Candidate index (verify with `EXPLAIN`):
   ```sql
   CREATE INDEX idx_tasks_lobby_visibility_creator
     ON tasks (lobby_id, visibility, creator_id);
   ```
10. Suppress task-assigned notifications for private tasks; ensure no
    cross-user notification is emitted (§8.2, §15.1).
11. Tests, then `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- A creates a private task with no `assigneeId` → assignee is A.
- A private task's `assigneeId` can never resolve to anyone but its
  creator, at create time or via update.
- `GET /api/tasks` (lobby-scoped) and `GET /api/tasks/mine` never return
  another user's private task.
- B cannot read/update/delete/change-visibility on A's private task
  (`404`); A can.
- Converting a shared task assigned to B into `PRIVATE` without
  simultaneously reassigning it to the creator fails with `400`.
- No task-assigned notification fires for a private task.

## REST API added / changed

- `TaskDto`, `TaskCreateDto`, `TaskUpdateDto` gain `visibility: "PRIVATE" |
  "SHARED"` (no legacy field — this is a new field, not a migration).
- New validation errors: `private-task-assignee-invalid` (`400`),
  `private-item-notification-invalid` (`400`, reused from PE-BE-02).
- `GET /api/tasks/mine` response contents change per the corrected
  semantic (§11.6) — document this as a behavior fix, not just an addition.

## Tests to add

- **Unit — `TaskAccessPolicyTest`**: mirrors `EventAccessPolicyTest` from
  PE-BE-02 for the task domain.
- **Unit — creation normalization**: omitted assignee on PRIVATE → creator;
  assignee == creator → accepted; assignee == other user → `400`;
  `notifyAssignee=true` on PRIVATE → `400`.
- **Integration — `/mine`**: B does not see A's private task in lobby list
  or in `/mine`; A sees their own private task in both.
- **Integration — mutate**: B's `PATCH`/`DELETE` on A's private task →
  `404`; A's own → succeeds.
- **Integration — visibility transition**: shared task assigned to B,
  `PATCH { visibility: PRIVATE }` without reassignment → `400`; same
  request with `assigneeId: creatorId` → succeeds.
- **Integration — notifications**: no task-assigned notification is
  recorded for any user other than the creator/assignee-is-creator.
- **Repository — visibility predicate**: same shape as PE-BE-02's event
  repository tests, task-scoped.

## Risk & follow-ups

- Lobby task statistics/counters must exclude other members' private
  tasks — that cross-surface sweep is PE-BE-04, not this task; this task
  only needs to make sure the *list/mine/detail* endpoints are correct.
- If any existing caller of `GET /api/tasks/mine` currently relies on the
  broader pre-fix semantic, document the behavior change explicitly in the
  PR description — per §11.6 the corrected semantic is intentional and must
  still exclude another creator's private tasks even if a broader
  interpretation is kept for shared tasks.
