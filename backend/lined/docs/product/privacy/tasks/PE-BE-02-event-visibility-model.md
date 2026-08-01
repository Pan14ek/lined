# Task PE-BE-02 — Event Visibility Model + Migration

**Branch:** `feature/event-visibility-model`

*Depends on PE-BE-01 (private event access enforcement). Builds the
persisted enum and formal access policy on top of the enforcement PE-BE-01
already added.*

## Detailed description

Replace the boolean `EventEntity.shared` with a persisted
`EventVisibility { PRIVATE, SHARED }` enum, following the repo's
two-release compatibility path (Release A: add + backfill + dual-write;
Release B: drop `shared`, tracked separately once no client depends on it —
this task delivers Release A only for a deployed environment, or a single
combined change in a pre-production environment with disposable data per
§10.3).

Introduce a formal `EventAccessPolicy` service so PE-BE-01's inline checks
become one reusable, testable component, and add repository-first
visibility-filtered query methods.

## Design references

- §7.1 Use an enum instead of a boolean
- §7.2 Default visibility is `SHARED`
- §9.1 Event entity target model
- §9.3 Event invariants
- §10.1–10.4 Database design and migration
- §11.2 `EventAccessPolicy`
- §11.4–11.5 Repository-first filtering, event repository methods
- §12.1–12.3, §12.6 REST API (create/update/list, backward-compatible field)

## Idea of this task

A boolean can't grow — the design explicitly rules out `SELECTED_MEMBERS`
for V1 but wants the API surface ready to add such values later without a
second migration. An enum column plus a dedicated `EventAccessPolicy`
interface also gives PE-BE-03 a template to copy for `TaskVisibility`
instead of inventing task-side conventions from scratch.

## Development steps

1. Add `event/domain/EventVisibility.java`: `PRIVATE`, `SHARED`.
2. Schema change in `schema.sql` (Release A shape):
   ```sql
   ALTER TABLE events ADD COLUMN visibility VARCHAR(16);
   UPDATE events SET visibility = CASE WHEN shared = TRUE THEN 'SHARED' ELSE 'PRIVATE' END;
   ALTER TABLE events ALTER COLUMN visibility SET NOT NULL;
   ALTER TABLE events ALTER COLUMN visibility SET DEFAULT 'SHARED';
   ALTER TABLE events ADD CONSTRAINT chk_events_visibility CHECK (visibility IN ('PRIVATE', 'SHARED'));
   ```
   Keep `shared` in place and dual-write it from the entity's `@PrePersist`/
   `@PreUpdate` (or service layer) so any client still reading `shared`
   keeps working during the transition.
3. Add `visibility` to `EventEntity` as `@Enumerated(EnumType.STRING)`,
   `nullable = false, length = 16`.
4. Add `event/service/EventAccessPolicy` with `ensureCanRead`,
   `ensureCanMutate`, `ensureCanChangeVisibility`, `isVisibleTo` — port the
   logic PE-BE-01 added inline into this class; `PRIVATE` + non-owner throws
   `NotFoundException`, `SHARED` preserves existing lobby-membership rules,
   and visibility changes require `requesterId == owner.id` (else `403` per
   §13, distinct from the `404` used for private-item access since the
   requester can already see the event is shared).
5. Add `findVisibleOverlapping(lobbyId, requesterId, from, to)` and
   `findVisibleById(eventId, requesterId)` repository methods using the
   predicate from §11.4 (`visibility = 'SHARED' OR owner_id = :requesterId`);
   replace PE-BE-01's ad-hoc filtering with these.
6. Candidate index (verify with `EXPLAIN` against real data, do not add
   blindly):
   ```sql
   CREATE INDEX idx_events_lobby_visibility_owner_time
     ON events (lobby_id, visibility, owner_id, start_at, end_at);
   ```
7. `EventCreateDto`/`EventUpdateDto`/`EventDto`: add `visibility` field.
   Accept both `visibility` and legacy `shared` per §12.6 rules (only one
   present → use it; both present and equivalent → accept; both present and
   contradictory → `400`). Reject `PRIVATE` + `notifyMembers=true` with
   `400` (error code `private_item.notification_invalid`, §13).
8. Update OpenAPI spec: add `visibility`, mark `shared` deprecated.
9. Tests, then `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- Every existing event row has a correct, non-null `visibility` derived
  from its prior `shared` value.
- Create/update accept `visibility` as the primary field; legacy `shared`
  requests keep working and map correctly; contradictory requests are
  rejected with `400`.
- `EventAccessPolicy` is the single source of truth for event read/mutate/
  visibility-change authorization, used by controller and service code.
- `PRIVATE` + `notifyMembers=true` is rejected at creation.
- No behavior regression for existing `shared` events/tests.

## REST API added / changed

- `EventDto`, `EventCreateDto`, `EventUpdateDto` gain `visibility:
  "PRIVATE" | "SHARED"`. `shared` remains present but deprecated in
  responses during the transition.
- New validation error: `private-item-notification-invalid` (`400`).
- New validation error for contradictory `visibility`/`shared` combination
  (`400`).

## Tests to add

- **Unit — `EventVisibilityMigrationTest`** (or repository test): backfilled
  rows have the expected `visibility` for both `shared = TRUE` and `FALSE`
  source rows.
- **Unit — `EventAccessPolicyTest`**: PRIVATE+owner → allow; PRIVATE+non-owner
  → `NotFoundException`; SHARED+member → allow (existing rule preserved);
  visibility change by non-owner → `403`.
- **Integration — create**: `visibility` alone; `shared` alone; both
  matching; both contradictory (`400`); `PRIVATE` + `notifyMembers=true`
  (`400`).
- **Repository — `findVisibleOverlapping`/`findVisibleById`**: SHARED
  returned to any member; PRIVATE returned only to owner; pagination/count
  reflects only visible rows.
- **Regression**: full existing event test suite green with the enum in
  place.

## Risk & follow-ups

- This task does not drop `shared` (Release B) — track that as a follow-up
  once the web client (UI-51) and any other consumers are confirmed to read
  only `visibility`.
- The repo currently manages schema via `schema.sql` + JPA `ddl-auto`
  rather than a real migration tool (§10.4). This task must not silently
  reinterpret existing `shared=false` rows — if a proper migration tool
  (Flyway/Liquibase) is adopted before this ships, redo the migration step
  through that tool instead of `schema.sql`.
