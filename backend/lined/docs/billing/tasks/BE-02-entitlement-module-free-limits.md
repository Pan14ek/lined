# Task BE-02 — Entitlement Module + Free Limit Enforcement

**Branch:** `feature/be-02-entitlement-module-free-limits`

*Depends on BE-01 (BillingAccount + EffectivePlanResolver). Before
BE-04 removes the legacy endpoints, so that any new authenticated
principals immediately land on the enforced Free tier.*

## Detailed description

Create the `entitlement` module (as its own top-level package,
`io.backend.lined.entitlement`) and enforce the Free/Pro capability
matrix from design §17 across the lobby module.

Scope:

1. `entitlement/domain/PlanEntitlements` record: `lobbiesMax`,
   `lobbyMembersMax`, `calendarIntegrationEnabled`,
   `remindersEnabled`, `freeSlotDetectionEnabled`.
2. `entitlement/domain/EntitlementCode` enum: `LOBBIES_MAX`,
   `LOBBY_MEMBERS_MAX`, `CALENDAR_INTEGRATION_ENABLED`,
   `REMINDERS_ENABLED`, `FREE_SLOT_DETECTION_ENABLED`.
3. `entitlement/application/EntitlementService` with a
   version-controlled config object:
   - `FREE = new PlanEntitlements(1, 4, false, true, true)`
   - `PRO  = new PlanEntitlements(10, 20, true, true, true)`
4. `entitlement/application/EntitlementService.getEntitlements(BillingAccountId)`
   composes with `EffectivePlanResolver` from BE-01.
5. `entitlement/application/LimitEvaluator`:
   `assertCanCreateLobby(ownerUserId)` counts owned active lobbies and
   throws `ConflictException` with code `LOBBY_LIMIT_EXCEEDED` when
   `count >= entitlements.lobbiesMax()`.
6. `LimitEvaluator.assertCanAcceptInvite(lobbyId)` counts current
   members and throws `ConflictException` with code
   `LOBBY_MEMBER_LIMIT_EXCEEDED` when
   `count >= ownerEntitlements.lobbyMembersMax()`.
7. Wire `assertCanCreateLobby` into `LobbyServiceImpl.create` (before
   persisting the new lobby) and `assertCanAcceptInvite` into
   `LobbyInviteServiceImpl.accept`.
8. Stable error codes surfaced via `GlobalExceptionHandler` from design
   §46 — extend the exception body to include the `code` field on
   `ConflictException`.

## Design references

- §7.3 Entitlement Module responsibilities
- §17 Plan and Entitlement Model (matrix, `PlanEntitlements` record,
  entitlement vs. flag vs. authorization vs. usage distinction)
- §29 Read-Only Lobby Operations (limits are the trigger)
- §46 Error Model (`LOBBY_LIMIT_EXCEEDED`,
  `LOBBY_MEMBER_LIMIT_EXCEEDED`)

## Idea of this task

Free must actually restrict what a user can do — otherwise there is no
value in Pro. Centralizing the matrix in one module means later product
changes (a new Pro capability, a limit change) touch one file, not
scattered `if` statements in the lobby/task/notification modules. It
also means BE-15's feature-flag gate can only ever add restrictions on
top of a coherent baseline.

## Development steps

1. Create the `entitlement` package tree.
2. Define `PlanEntitlements` and static `FREE` / `PRO` constants.
3. Implement `EntitlementService` and `LimitEvaluator`; the evaluator
   depends on `LobbyRepository.countActiveOwnedBy(userId)` — add that
   method if it doesn't exist (return owned lobbies with
   `lifecycleStatus = ACTIVE`, which BE-03 introduces; for now count all
   owned lobbies).
4. Extend `common.exception.ConflictException` (and the base
   `BaseAppException`) with an optional `errorCode` string; wire
   `GlobalExceptionHandler` to include it in the response body.
5. Wire `LobbyServiceImpl.create` to call
   `limitEvaluator.assertCanCreateLobby(currentUserId)` before persist.
6. Wire `LobbyInviteServiceImpl.accept` to call
   `limitEvaluator.assertCanAcceptInvite(lobbyId)` before the invite is
   marked accepted / member is added.
7. Tests.
8. Run `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- A Free user cannot own more than 1 lobby; the 2nd create returns
  `409 LOBBY_LIMIT_EXCEEDED`.
- A Free-owned lobby cannot exceed 4 members; the 5th accepted invite
  returns `409 LOBBY_MEMBER_LIMIT_EXCEEDED`.
- Pro-owned entitlements allow 10 / 20 respectively.
- No change to any existing test's happy-path fixtures whose lobbies
  stay under the Free limits.
- `./gradlew test`, `./gradlew checkstyleMain`, `./gradlew spotbugsMain`
  pass.

## REST API added / changed

None. This task changes the semantics of two existing endpoints
(`POST /api/lobbies`, `POST /api/lobby-invites/{id}/accept`) — the
error-code surface is documented for UI-45.

## Tests to add

- **Unit — `EntitlementServiceTest`**: returns FREE matrix when
  `EffectivePlanResolver` returns FREE; returns PRO matrix when it
  returns PRO.
- **Unit — `LimitEvaluatorTest`**: allows 1st lobby on Free, rejects
  2nd; allows 4-member invite accept on Free, rejects 5th; allows 10th
  lobby / 20th member on Pro; rejects 11th / 21st.
- **Integration — `LobbyServiceCreateLimitIT`** (Testcontainers): user
  owning 1 lobby cannot create a 2nd (409 with code).
- **Integration — `LobbyInviteAcceptLimitIT`**: 5th accept against a
  Free-owned 4-member lobby returns 409 with code.
- **Controller — `LobbyControllerLimitTest`**: end-to-end 409 body
  shape includes `code` field.

## Risk & follow-ups

- BE-01's resolver still returns FREE for everyone until BE-06 wires
  real subscriptions in. That means when BE-02 lands, existing users
  who own >1 lobby will not be forced to reduce — the check only fires
  on **new** creates. The 30-day reduction workflow is BE-12; do not
  retroactively reduce here.
- Pro entitlements list matches design §17.1; if product changes limits
  before checkout goes live, update the constants in one place.
