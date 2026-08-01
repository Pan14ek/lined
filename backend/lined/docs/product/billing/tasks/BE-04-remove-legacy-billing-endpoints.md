# Task BE-04 — Remove Legacy Billing Endpoints + `GET /api/billing/me`

**Branch:** `feature/be-04-remove-legacy-billing-endpoints`

*Depends on BE-01 (BillingAccount + resolver) and BE-02 (entitlement
module). Blocks UI-38 (which reads `/api/billing/me`).*

## Detailed description

The prototype APIs let the client name any `userId` and activate any
plan locally without a payment. Design §41.1 forbids this. This task
removes the unsafe surface and replaces it with a single authenticated
`GET /api/billing/me` derived from `X-User-Id`.

Scope:

1. Delete or gate as ADMIN-only the following endpoints in
   `PlanController`:
   - `POST /api/plans` — deleted (catalog moves under BE-05, admin-only)
   - `PUT /api/plans/{id}` — deleted
   - `DELETE /api/plans/{id}` — deleted
   - `GET /api/plans` — **kept for now** but returns nothing paid-related
     (drops price / duration fields from the DTO); UI-38 will stop
     calling it. Fully removed by BE-05.
2. Delete the following endpoints in `SubscriptionController`:
   - `POST /api/subscriptions`
   - `POST /api/subscriptions/{userId}/cancel-active`
   - `GET /api/subscriptions/{userId}/active`
   - `GET /api/subscriptions/{userId}/history`
3. Delete `SubscriptionServiceImpl` local-activation logic (the code
   that persists a `user_subscriptions` row on POST). Keep the entity +
   repository for now so existing FREE rows created at registration are
   still readable; BE-15's migration report will drop the table.
4. Update `AccountApplicationServiceImpl.registerUser` to stop creating
   a `user_subscriptions` FREE row on new registrations. BillingAccount
   creation (from BE-01) remains; Free is implicit.
5. Add `billing/api/web/BillingController` exposing:
   - `GET /api/billing/me` → response body:
     ```json
     {
       "billingAccountId": "<uuid|long>",
       "effectivePlan": "FREE" | "PRO",
       "subscription": null,
       "limits": {
         "lobbiesMax": 1,
         "lobbyMembersMax": 4
       }
     }
     ```
   - The `subscription` field stays `null` in this task — BE-11 fills
     it in once real subscriptions exist. The response object shape is
     fixed now so UI-38 can render against a stable contract.
6. Response body is derived only from the authenticated principal —
   never from a query/path/body field.

## Design references

- §37.1 `GET /api/billing/me`
- §41.1 User ownership
- §46 Error Model
- §48.2 Phase 4: Remove unsafe APIs
- §48.2 Phase 3: Switch access logic to `EffectivePlanResolver`
- ADR-004

## Idea of this task

Every subsequent billing endpoint (checkout, cancel, resume, …) will
follow the same "authenticated principal → BillingAccount → domain
action" pattern. Landing `/api/billing/me` first — with the legacy
holes closed in the same PR — means UI-38 has a real endpoint to render
and no other task has to work around the legacy `userId`-in-path
pattern.

## Development steps

1. Add `BillingController` under `billing/api/web/` with a single
   `@GetMapping("/api/billing/me")` method returning `BillingMeDto`.
   Body derived via
   `billingAccountService.getByOwnerUserId(currentUserId)` +
   `entitlementService.getEntitlements(...)` +
   `effectivePlanResolver.resolve(...)`.
2. Add `BillingMeDto`, `BillingSubscriptionDto` (nullable),
   `BillingLimitsDto` records under `billing/api/web/dto/`.
3. Delete the four `SubscriptionController` endpoints and the local
   activation code they call. Keep `UserSubscriptionRepository` and
   the entity temporarily.
4. Delete the three write endpoints on `PlanController`; slim its DTO
   (drop `priceUsd`, `durationDays`) — BE-05 replaces the whole
   endpoint.
5. Remove the `subscriptionService.start(...)` call from
   `AccountApplicationServiceImpl.registerUser`; keep the
   `billingAccountService.ensurePersonalAccount(...)` call from BE-01.
6. Update any existing test whose fixture relied on the legacy
   endpoints — most will just drop the pre-condition setup.
7. Tests.
8. Run `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- `GET /api/billing/me` returns `effectivePlan=FREE` and Free limits
  for every existing and newly-registered user.
- The four legacy subscription endpoints and three plan write
  endpoints return `404` (unmapped) — not `500`.
- Registering a new user does not touch `user_subscriptions`.
- Every existing integration test either passes unchanged or has its
  legacy fixture removed with no functional impact.
- `./gradlew test`, `./gradlew checkstyleMain`, `./gradlew spotbugsMain`
  pass.

## REST API added / changed

| Purpose | Method + Path |
|---|---|
| Current billing state | `GET /api/billing/me` (new; derives everything from `X-User-Id`) |
| Removed | `POST /api/subscriptions`, `POST /api/subscriptions/{userId}/cancel-active`, `GET /api/subscriptions/{userId}/active`, `GET /api/subscriptions/{userId}/history` |
| Removed | `POST /api/plans`, `PUT /api/plans/{id}`, `DELETE /api/plans/{id}` |

## Tests to add

- **Controller — `BillingControllerMeTest`**:
  - 200 with `effectivePlan=FREE`, `subscription=null`, Free limits for
    a user with no paid subscription
  - 401/403 (whichever the app returns) when `X-User-Id` header is
    missing
  - Response never echoes an incoming query/body `userId` — attempt to
    pass one is ignored
- **Controller — `LegacyBillingEndpointsRemovedTest`**: 404 for each
  removed path (using `MockMvc`).
- **Integration — `RegistrationNoSubscriptionRowIT`**: after
  registration, `user_subscriptions` has 0 rows for the new user.

## Risk & follow-ups

- Anything else (mobile, scripts) calling the old endpoints will 404.
  Coordinate the deploy with the UI-38 rollout so the web app is
  updated at the same time.
- `user_subscriptions` table stays for one release for rollback
  investigation, then BE-15 drops it as part of the migration cleanup.
