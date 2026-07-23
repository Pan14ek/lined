# Task BE-12 — Downgrade + Archive Workflow

**Branch:** `feature/be-12-downgrade-archive-workflow`

*Depends on BE-03 (lobby lifecycle + access mode + endpoints), BE-11
(subscription events). Blocks UI-44, UI-45, UI-46.*

## Detailed description

When the effective plan flips from PRO to FREE, mark excess owned
lobbies READ_ONLY with a 30-day archive deadline. Wire a daily job to
archive lobbies whose deadline has passed. Restore READ_WRITE
automatically when the effective plan flips back to PRO, except for
already-archived lobbies (owner must restore those manually via BE-03's
endpoint).

Scope:

1. `entitlement/application/EffectivePlanChangeHandler` subscribes to
   `EFFECTIVE_PLAN_CHANGED` events published by BE-11:
   - **PRO → FREE**: for each active lobby owned by the account's
     owner user beyond the Free limit (1), set
     `access_mode=READ_ONLY`, `restriction_reason=OWNER_PLAN_LIMIT_EXCEEDED`,
     `archive_at = now + 30 days`. The retained lobby is chosen by the
     user via `POST /api/lobbies/{id}/select-as-free` (BE-03); if no
     selection has been made, keep the oldest lobby READ_WRITE as a
     placeholder and mark all others READ_ONLY.
   - **FREE → PRO**: for each `READ_ONLY, lifecycle=ACTIVE` lobby with
     `restriction_reason=OWNER_PLAN_LIMIT_EXCEEDED`, flip to
     READ_WRITE, clear `restriction_reason` and `archive_at`.
     Archived lobbies stay ARCHIVED — owner uses BE-03's `restore`
     endpoint.
2. New scheduled job `LobbyArchiveJob`
   (`@Scheduled(cron="0 30 3 * * *")` daily at 03:30 UTC):
   - selects `lifecycle_status=ACTIVE`, `access_mode=READ_ONLY`,
     `archive_at <= now` lobbies
   - sets `lifecycle_status=ARCHIVED` (keeps access_mode READ_ONLY),
     publishes `LOBBY_ARCHIVED` event for BE-15 to notify
   - job is idempotent: repeated runs on the same row are no-ops
3. Reduction-writes whitelist (design §29.3) — reuse the
   `LobbyWritePolicy` from BE-03 with the four allowed actions:
   `REMOVE_MEMBER`, `DELETE_LOBBY`, `LEAVE_LOBBY`,
   `SELECT_AS_FREE_LOBBY`.
4. New endpoint annotation via BE-03's `POST /api/lobbies/{id}/restore`
   — this task just plugs the capacity + entitlement check into it
   properly.
5. Explicit refusal of new invites when owner is FREE and lobby is at
   member cap — already handled by BE-02, but this task adds an
   integration test proving the interaction.
6. Notifications: when a lobby flips to READ_ONLY or is archived, this
   task publishes `LOBBY_READ_ONLY` / `LOBBY_ARCHIVED` events; BE-15
   attaches the notification handlers.

## Design references

- §28 Downgrade and Over-Limit Resource Policy
- §29 Read-Only Lobby Operations
- §30 Archived Lobby Policy
- §30.1 Re-purchase behavior
- §36.2 Lobby lifecycle events

## Idea of this task

Downgrade must never destroy data and must give the owner a real path
back to writeable state without a re-subscription. Wrapping the read-only
mark + 30-day archive deadline + auto-restore in one event-driven
workflow means every trigger (cancel, expire, full refund) reaches the
same consistent outcome.

## Development steps

1. Add `EffectivePlanChangeHandler` under `entitlement/application/`,
   subscribed to `EFFECTIVE_PLAN_CHANGED`.
2. Implement the PRO→FREE reduction: query
   `LobbyRepository.findActiveOwnedBy(userId)`, sort by createdAt asc,
   keep the oldest READ_WRITE, mark the rest READ_ONLY with the
   30-day deadline.
3. Implement the FREE→PRO restoration: query lobbies flagged by this
   handler, flip back.
4. Add `LobbyArchiveJob` under `lobby/application/`.
5. Publish `LOBBY_READ_ONLY_APPLIED`, `LOBBY_RESTORED_TO_WRITE`,
   `LOBBY_ARCHIVED` domain events.
6. Extend `LobbyController.restore` (BE-03) to call
   `EntitlementService`/`LimitEvaluator` for capacity — if BE-03
   already did this, add an integration test confirming Pro capacity is
   enforced on restore.
7. Tests.
8. Run `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- Cancelling Pro subscription and letting the period elapse (or a
  full refund) results in all-but-one owned lobbies flipped to
  READ_ONLY with `archive_at = now + 30d`.
- Daily job archives lobbies whose `archive_at` has passed; no lobby
  is deleted.
- Restoring Pro flips READ_ONLY lobbies back to READ_WRITE
  automatically; archived lobbies stay archived and must be restored
  manually via BE-03's endpoint.
- Attempts to create a new lobby, add a member, or write a task to a
  READ_ONLY lobby return `LOBBY_READ_ONLY_DUE_TO_PLAN`; reduction
  writes still succeed.
- `./gradlew test`, `./gradlew checkstyleMain`, `./gradlew spotbugsMain`
  pass.

## REST API added / changed

None here (BE-03 shipped the endpoints). This task changes the
behavior of the effective-plan transition indirectly: `GET /api/lobbies/mine`
starts including READ_ONLY / ARCHIVED lobbies with the new fields
already introduced by BE-03.

## Tests to add

- **Unit — `EffectivePlanChangeHandlerTest`**: PRO→FREE with 3 owned
  lobbies → 1 READ_WRITE + 2 READ_ONLY with deadline; FREE→PRO
  restores the 2 to READ_WRITE.
- **Integration — `LobbyArchiveJobIT`**: seeded READ_ONLY lobby with
  past `archive_at` becomes ARCHIVED after job runs; job is idempotent.
- **Integration — `DowngradeReductionWritesIT`**: on a READ_ONLY
  lobby: `PATCH /api/lobbies/{id}` returns 409; `DELETE
  /api/lobbies/{id}/members/{userId}` succeeds; `DELETE
  /api/lobbies/{id}` succeeds; `POST /api/lobbies/{id}/select-as-free`
  flips it back to READ_WRITE.
- **Integration — `RestoreCapacityGateIT`**: on Pro with 10 lobbies
  already active, restoring an 11th returns 409 LOBBY_LIMIT_EXCEEDED.
- **End-to-end — `SubscriptionExpirationDowngradeIT`**: sandbox
  `PROVIDER_EXPIRED` event → subscription EXPIRED → effective-plan
  event fires → lobbies flip READ_ONLY.

## Risk & follow-ups

- If the user removes members to bring a READ_ONLY lobby under
  `LOBBY_MEMBERS_MAX`, `select-as-free` (BE-03) is the mechanism —
  the reduction job does not auto-select anything.
- Multiple owners of shared lobbies: the design assumes single
  ownership; if that changes (Family / Team), this handler needs to
  consider effective plan across all co-owners.
- The oldest-kept-READ_WRITE placeholder policy is a defensive
  default; if product wants a different tie-break, change it here.
