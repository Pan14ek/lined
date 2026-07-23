# Task BE-06 — Subscription Schema + State Machine

**Branch:** `feature/be-06-subscription-schema-state-machine`

*Depends on BE-01 (BillingAccount), BE-05 (PriceCode). Blocks BE-10
(checkout creates a `PENDING` subscription), BE-11 (state transitions),
and BE-13 (transactions FK to subscription).*

## Detailed description

Persist the target `billing_subscriptions` model plus provider-customer
mapping, wire it into `EffectivePlanResolver`, and ship the state-machine
helper used by BE-11.

Scope:

1. New table `billing_subscriptions` per design §12.5:
   `id`, `billing_account_id` FK, `provider`, `provider_subscription_id`
   (unique), `plan_code`, `current_price_code`, `status`,
   `current_period_start`, `current_period_end`, `cancel_at_period_end`
   (bool), `scheduled_price_code` (nullable), `scheduled_change_at`
   (nullable), `past_due_since` (nullable), `grace_ends_at` (nullable),
   `provider_updated_at`, `last_synced_at`, `version` (bigint,
   optimistic locking), `created_at`, `updated_at`.
2. Constraints:
   - unique on `provider_subscription_id`
   - partial index enforcing "at most one non-terminal subscription per
     billing account" — non-terminal = status in
     `PENDING|ACTIVE|PAST_DUE`
   - `current_period_end >= current_period_start`
   - scheduled fields must be consistent (both null or both non-null)
   - `grace_ends_at`/`past_due_since` only valid when `status=PAST_DUE`
3. New table `billing_provider_customers`:
   `id`, `billing_account_id` FK, `provider`, `provider_customer_id`
   (unique), timestamps. Unique on `(billing_account_id, provider)`.
4. Enum `SubscriptionStatus`: `PENDING`, `ACTIVE`, `PAST_DUE`,
   `CANCELED`, `EXPIRED`.
5. Entities + repositories under `billing/domain/subscription/`,
   `billing/domain/account/` (add `ProviderCustomerEntity` +
   `ProviderCustomerRepository`).
6. `SubscriptionStateMachine` helper (pure function class):
   - `assertTransition(from, event) → to` for the transitions in §15
   - throws `ConflictException("PROVIDER_STATE_CONFLICT")` on illegal
     transitions
7. Replace BE-01's `NoOpPaidSubscriptionLookup` with
   `SubscriptionRepositoryLookup` — returns the current non-terminal
   subscription for the account, if any.
8. `EffectivePlanResolver.grantsPaidAccess(subscription, now)` policy
   table (design §16.1):
   - `ACTIVE` and `now < currentPeriodEnd` → paid
   - `ACTIVE` and cancel scheduled, `now < currentPeriodEnd` → paid
   - `PAST_DUE` and `now < graceEndsAt` → paid
   - all others → not paid (returns FREE)

## Design references

- §12.5 `billing_subscriptions`
- §14 Subscription Status Model
- §15 Subscription State Machine
- §16 Effective Plan Resolution (policy)
- §42.3 Optimistic locking
- §44 Source-of-Truth Rules
- §45 Time Handling

## Idea of this task

The subscription table is the projection all product-access decisions
read from. Getting the columns, constraints, and state-machine helper
right here — separately from the endpoints that mutate it — makes BE-11
a thin wiring layer instead of a mixed schema+behavior change.

## Development steps

1. Append `CREATE TABLE IF NOT EXISTS billing_subscriptions ...` and
   `CREATE UNIQUE INDEX IF NOT EXISTS ...` (partial) to `schema.sql`.
2. Append `CREATE TABLE IF NOT EXISTS billing_provider_customers ...`.
3. Add `SubscriptionStatus`, `SubscriptionEntity`,
   `SubscriptionRepository`.
4. Add `ProviderCustomerEntity`, `ProviderCustomerRepository`.
5. Add `SubscriptionStateMachine`: static `TRANSITIONS` map + `assert`
   method + typed `SubscriptionEvent` enum
   (`PAYMENT_CONFIRMED`, `PAYMENT_FAILED`, `PAYMENT_RECOVERED`,
   `CANCELLATION_SCHEDULED`, `CANCELLATION_RESUMED`,
   `PRICE_CHANGE_SCHEDULED`, `PERIOD_ELAPSED`,
   `PROVIDER_EXPIRED`, `NEW_CHECKOUT`).
6. Replace `NoOpPaidSubscriptionLookup` binding with
   `SubscriptionRepositoryLookup`.
7. Update `EffectivePlanResolver` with the `grantsPaidAccess` policy.
8. Tests.
9. Run `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- Schema migrates cleanly; partial-index guarantees one non-terminal
  subscription per account (concurrent insert attempt → constraint
  violation).
- `SubscriptionStateMachine.assertTransition(ACTIVE, PAYMENT_FAILED)`
  returns `PAST_DUE`; illegal transition throws.
- `EffectivePlanResolver` now returns `PRO` for an account with an
  `ACTIVE` subscription and `currentPeriodEnd > now`.
- `GET /api/billing/me` still works (BE-04); the `subscription` field
  remains `null` because no endpoint yet creates rows — BE-10/BE-11 do.
- `./gradlew test`, `./gradlew checkstyleMain`, `./gradlew spotbugsMain`
  pass.

## REST API added / changed

None. Data-model + resolver-behavior only.

## Tests to add

- **Unit — `SubscriptionStateMachineTest`**: every valid transition in
  §15 returns the expected next state; illegal transitions throw
  `PROVIDER_STATE_CONFLICT`.
- **Unit — `EffectivePlanResolverPolicyTest`**: matrix from §16.1
  covered row-by-row.
- **Integration — `SubscriptionRepositoryIT`** (Testcontainers):
  - unique `provider_subscription_id` blocks duplicates
  - partial unique index blocks a 2nd non-terminal subscription for
    the same account, allows terminal + non-terminal coexistence
  - optimistic lock: two concurrent updates → one wins,
    `OptimisticLockException` on the other
- **Integration — `ProviderCustomerRepositoryIT`**: unique constraint
  on `(billing_account_id, provider)`.

## Risk & follow-ups

- The partial unique index must be added with a name (e.g.
  `uq_billing_subscriptions_active`) so BE-15's reconciliation report
  can hunt for violations by name.
- If the chosen production provider allows two active subscriptions for
  the same customer (add-ons, seat expansions), the partial index will
  need to relax — flag in the ADR for BE-15.
