# Task BE-03 — Lobby Lifecycle Status + Access Mode

**Branch:** `feature/be-03-lobby-lifecycle-access-mode`

*Depends on BE-02 (entitlement module). Prepares the lobby domain for
the downgrade/archive workflow in BE-12; ships the endpoints the UI
(UI-44, UI-45, UI-46) will call.*

## Detailed description

Extend `LobbyEntity` with the lifecycle + access-mode fields required by
design §28 and add the three lobby endpoints from §38. Enforce read-only
in every write path with a stable error code.

Scope:

1. Add columns to `lobbies`:
   - `lifecycle_status VARCHAR NOT NULL DEFAULT 'ACTIVE'` — enum
     `ACTIVE`, `ARCHIVED`, `DELETED`
   - `access_mode VARCHAR NOT NULL DEFAULT 'READ_WRITE'` — enum
     `READ_WRITE`, `READ_ONLY`
   - `restriction_reason VARCHAR NOT NULL DEFAULT 'NONE'` — enum
     `NONE`, `OWNER_PLAN_LIMIT_EXCEEDED`, `MEMBER_LIMIT_EXCEEDED`,
     `BILLING_GRACE_EXPIRED`
   - `archive_at TIMESTAMPTZ NULL`
   - `selected_as_free_at TIMESTAMPTZ NULL`
2. Corresponding Java enums under
   `lobby/domain/{LobbyLifecycleStatus,LobbyAccessMode,LobbyRestrictionReason}`.
3. `LobbyServiceImpl` write paths (`update`, `removeMember` for non-owner
   uses, task/event mutations, invite creation, etc.) call a new
   `LobbyWritePolicy.assertWritable(lobby, WriteAction)` helper that
   throws `ConflictException` with code
   `LOBBY_READ_ONLY_DUE_TO_PLAN` when
   `accessMode == READ_ONLY` unless the action is on the reduction
   whitelist (see step 4).
4. `WriteAction` enum whitelist (allowed on read-only lobbies):
   `REMOVE_MEMBER`, `DELETE_LOBBY`, `LEAVE_LOBBY`,
   `SELECT_AS_FREE_LOBBY`.
5. New endpoint `POST /api/lobbies/{lobbyId}/select-as-free`:
   - requires ownership (`LobbyAccessPolicy.ensureOwner`)
   - requires current effective plan is Free
     (`EntitlementService.getEntitlements(...).lobbiesMax() == 1`)
   - requires `memberCount ≤ 4`; otherwise 409
     `LOBBY_MEMBER_LIMIT_EXCEEDED` with a hint to remove members
   - clears any other lobby previously flagged
     `selected_as_free_at` for this owner
   - flips the target lobby's `access_mode` to `READ_WRITE`,
     `restriction_reason=NONE`, sets `selected_as_free_at=now`,
     `archive_at=NULL`
6. New endpoint `POST /api/lobbies/{lobbyId}/restore`:
   - requires ownership
   - requires `lifecycle_status = ARCHIVED`
   - runs `EntitlementService`/`LimitEvaluator` capacity check
   - on success: `lifecycle_status=ACTIVE`, `access_mode=READ_WRITE`,
     `restriction_reason=NONE`, `archive_at=NULL`
   - on capacity failure: 409 `LOBBY_LIMIT_EXCEEDED`
7. Extend `GET /api/lobbies/mine` and `GET /api/lobbies/{id}` to include
   the new fields in the DTO.
8. New query: `GET /api/lobbies?lifecycleStatus=ARCHIVED` returns
   archived lobbies where the caller is a member or the owner (owner
   sees all their own; non-owner members see ones they belong to).

## Design references

- §28 Downgrade and Over-Limit Resource Policy
- §28.3 Lobby state model (enums)
- §29 Read-Only Lobby Operations (whitelist)
- §29.4 API error `LOBBY_READ_ONLY_DUE_TO_PLAN`
- §30 Archived Lobby Policy
- §38 Lobby API Additions
- §46 Error Model

## Idea of this task

BE-12 is the workflow; BE-03 is the vocabulary. Landing the columns,
enums, endpoints, and read-only guard first means BE-12 can focus on
the reduction/archival mechanics without touching the entity model.
Every UI billing task that touches lobbies (UI-44/45/46) depends on
this shape being live.

## Development steps

1. Append `ALTER TABLE lobbies ADD COLUMN IF NOT EXISTS ...` for each of
   the five columns to `schema.sql`.
2. Add the three enums under `lobby/domain/`.
3. Extend `LobbyEntity` (fields, getters, protected setters); update
   `LobbyMapper` DTOs.
4. Add `LobbyWriteAction` enum + `LobbyWritePolicy` helper; wire into
   every mutating service method (create is skipped — new lobbies are
   always READ_WRITE).
5. Update the existing invite-flow, task, and event write paths that
   currently call the lobby to also pass through
   `LobbyWritePolicy.assertWritable` (this only affects lobbies that
   BE-12 will later flip to READ_ONLY; nothing changes for today's
   ACTIVE READ_WRITE lobbies).
6. Add `LobbyController` endpoints for `select-as-free`, `restore`, and
   the archived-list query.
7. Update `LobbyRepository` with a `findByOwnerAndSelectedAsFree` helper
   used by `select-as-free` to clear the previous selection.
8. Tests.
9. Run `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- Existing lobbies migrate cleanly: every row lands with
  `lifecycle_status=ACTIVE`, `access_mode=READ_WRITE`,
  `restriction_reason=NONE`, `archive_at=NULL`. No behavior change for
  users whose plan is Pro-equivalent or under Free limits.
- Read-only lobbies (which nothing yet creates) reject normal writes
  with 409 `LOBBY_READ_ONLY_DUE_TO_PLAN` but accept the 4 reduction
  actions.
- `select-as-free` and `restore` endpoints work as specified and 409
  with stable codes on validation failure.
- Archived list query respects membership boundaries.
- `./gradlew test`, `./gradlew checkstyleMain`, `./gradlew spotbugsMain`
  pass.

## REST API added / changed

| Purpose | Method + Path |
|---|---|
| Select the Free lobby after downgrade | `POST /api/lobbies/{lobbyId}/select-as-free` |
| Restore an archived lobby | `POST /api/lobbies/{lobbyId}/restore` |
| List archived lobbies | `GET /api/lobbies?lifecycleStatus=ARCHIVED` |
| DTO change | `GET /api/lobbies/mine`, `GET /api/lobbies/{id}` now include `lifecycleStatus`, `accessMode`, `restrictionReason`, `archiveAt`, `selectedAsFreeAt` |

## Tests to add

- **Unit — `LobbyWritePolicyTest`**: READ_WRITE allows every action;
  READ_ONLY blocks non-whitelist writes with
  `LOBBY_READ_ONLY_DUE_TO_PLAN`; READ_ONLY allows all four whitelist
  actions.
- **Unit — `SelectAsFreeServiceTest`**: rejects when effective plan is
  Pro; rejects when the target has 5+ members; clears the previous
  selection; success flips fields.
- **Integration — `LobbyLifecycleMigrationIT`**: existing lobbies get
  the correct defaults; new columns are non-null after migration.
- **Controller — `LobbyControllerSelectAsFreeTest`**: 200 on happy path;
  409 (`LOBBY_MEMBER_LIMIT_EXCEEDED`) when too many members; 403 when
  caller is not owner; 404 when lobby not found.
- **Controller — `LobbyControllerRestoreTest`**: 200 on happy path; 409
  (`LOBBY_LIMIT_EXCEEDED`) when Pro capacity would be exceeded.
- **Controller — `ArchivedLobbiesListTest`**: owner sees all their
  archived; a member sees only their own.

## Risk & follow-ups

- BE-12 owns the code that actually **sets** `access_mode=READ_ONLY` on
  downgrade and the daily job that archives. Until BE-12 lands, the
  read-only path exists but is only reachable via a manual DB update
  during testing.
- Coordinate with any in-flight lobby PR: the DTO shape changes are
  additive but every consumer must be updated in the same PR that
  ships.
