# Task PE-BE-01 — Private Event Access Enforcement

**Branch:** `bug/private-event-access-enforcement`

*No dependencies. This is a standalone security correction and should ship
before any other private-events/tasks work.*

## Detailed description

`EventEntity.shared` currently expresses intent ("this event is not shared")
but the service layer does not enforce it: the event list endpoint queries
all overlapping events in a lobby and maps every one of them to `EventDto`
regardless of `shared`, and update/delete only check lobby membership, not
ownership, for `shared == false` events. Any lobby member can therefore read,
edit, or delete another member's supposedly-private event, and the conflict
endpoint returns full `EventDto` objects for both sides of an overlap.

This task fixes that gap using the *existing* `shared` boolean — it does
**not** introduce the `EventVisibility` enum or a schema migration (that is
PE-BE-02). Treat `shared == false` as `PRIVATE` and `shared == true` as
`SHARED` for the purposes of this task.

## Design references

- Design doc: `backend/lined/docs/product/privacy/private-events-and-tasks-system-design.md`
- §3.1 Existing implementation and identified gaps (events)
- §8.1 Event access matrix
- §11.4 Repository-first filtering
- §13 Error model (unauthorized private resource → normal `404`)
- §14.2 Conflict endpoint privacy
- §25 Phase 0 — Immediate event privacy correction

## Idea of this task

Private-event confidentiality is a security boundary, not a UI convenience.
Fixing it now — before the larger enum/migration/task work — closes the
active data-exposure gap without waiting on a schema change, and gives the
later PE-BE-02 enum migration a codebase that already has the right
enforcement shape to extend.

## Development steps

1. Add a requester-aware repository query for the event list: extend
   the existing overlapping-events query with
   ```sql
   AND (event.shared = TRUE OR event.owner_id = :requesterId)
   ```
   so private rows never leave the database unless the requester owns them.
2. Add `findVisibleById(eventId, requesterId)` (or equivalent) returning
   `Optional<EventEntity>` empty for a private event the requester doesn't
   own, and use it in the single-event GET.
3. In the event service's update/delete/patch paths, when
   `event.shared == false`, require `event.owner.equals(requesterId)`;
   otherwise throw `NotFoundException` (never `ForbiddenException` — see
   §8.1/§13, this must look identical to "event not found").
4. Sanitize the conflict endpoint: when a returned conflicting event is
   private and not owned by the requester, replace the full `EventDto` with
   a minimal shape carrying only `ownerId`, `visibility`/`shared`, and
   `detailsAvailable: false` — no title, location, or ID (§14.2). Requesters
   never see another user's private conflict details.
5. Ensure no member notification is emitted for a private event's creation,
   update, or delete (grep existing notification-triggering code paths in
   the event service for calls that don't already check `shared`).
6. Add the regression tests listed below.
7. Run `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- Listing a lobby's events for user B never includes user A's private
  event, even though both are lobby members.
- `GET /api/calendar/events/{id}` for A's private event returns `404` to B
  and C, `200` to A.
- `PATCH`/`DELETE` on A's private event from B returns `404`.
- The conflict endpoint never returns another user's private title,
  location, or event ID.
- A's private event still counts toward A's busy time in free-slot
  calculations.
- No cross-member notification fires for a private event.
- `./gradlew test`, `./gradlew checkstyleMain`, `./gradlew spotbugsMain`
  pass with no regression in existing shared-event behavior.

## REST API added / changed

No new endpoints or fields. Response *contents* change: event list/detail
responses no longer include other members' private events; the conflict
response's second (non-owner) side is sanitized as described above.

## Tests to add

- **Unit/Integration — event list**: A creates a private event; A sees it in
  their own list; B (lobby member) does not see it; C (non-member) gets the
  existing membership-denial behavior for the lobby.
- **Integration — direct access**: B requests A's private event by ID →
  `404`. A requests it → `200`.
- **Integration — mutate**: B's `PATCH`/`DELETE` on A's private event → `404`.
  A's own `PATCH`/`DELETE` → succeeds.
- **Integration — conflicts**: overlapping private events for A and B; A's
  conflict response shows A's own details but only `ownerId`/`detailsAvailable:
  false` for B's side, and vice versa.
- **Integration — free slots**: A's private event still blocks A's busy time
  in the free-slot response; B's free-slot response contains no reference to
  A's event details.
- **Integration — notifications**: creating/updating/deleting a private
  event produces no notification record for any user other than the owner.
- **Regression**: all existing shared-event tests continue to pass unchanged.

## Risk & follow-ups

- This task deliberately does not touch the ICS feed or import paths beyond
  what already exists — those get a focused pass in PE-BE-04.
- PE-BE-02 will replace `shared` with the `EventVisibility` enum; keep the
  new access-check logic in one clearly named method (e.g.
  `EventAccessPolicy`-shaped, even if not yet its own class) so PE-BE-02 can
  swap the underlying field without touching call sites.
