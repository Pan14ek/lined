# Task BE-01 — BillingAccount + Effective-Plan Resolver

**Branch:** `feature/be-01-billing-account-effective-plan`

*No dependencies. Foundation task — everything else builds on
BillingAccount ownership and the resolver's implicit Free fallback.*

## Detailed description

Introduce the `BillingAccount` aggregate so paid billing state is owned by
a commercial account, not directly by `UserEntity`. Add an
`EffectivePlanResolver` that returns `PlanCode.FREE` whenever no valid
paid subscription exists (implicit Free — the design's ADR-002). Do not
persist a Free subscription row.

Scope:

1. New `billing/domain/account/` package with `BillingAccountEntity`
   (`id`, `owner_user_id`, `type=PERSONAL`, `status=ACTIVE`, `version`,
   `createdAt`, `updatedAt`).
2. Unique constraint on `(owner_user_id, type)` — one Personal account
   per user.
3. New `billing/domain/plan/PlanCode` enum: `FREE`, `PRO` (no `FAMILY`).
4. New `billing/application/EffectivePlanResolver` returning `PlanCode`
   from a `BillingAccountId` + `Instant now`. Consult the subscription
   repository added in BE-06 through a repository port that is
   temporarily backed by a stub returning empty until BE-06 lands — this
   task delivers the resolver contract and its unit tests.
5. Registration: `AccountApplicationServiceImpl.registerUser` also
   creates a Personal BillingAccount for the new user (idempotent by
   `(owner_user_id, PERSONAL)`).
6. Backfill: a one-time idempotent migration seed (SQL block in
   `schema.sql`) creates a Personal BillingAccount for every existing
   user that lacks one — `INSERT ... SELECT ... WHERE NOT EXISTS`.
7. No public REST endpoint is added; `GET /api/billing/me` lands in
   BE-04.

## Design references

- §5 Confirmed Product Decisions — owner is BillingAccount, initial type
  Personal
- §6.2 Domain Language — BillingAccount
- §11 Core Domain Model — BillingAccount + User relations
- §12.1 `billing_accounts` schema
- §16 Effective Plan Resolution
- §48 Migration from the Prototype (backfill)
- ADR-001, ADR-002

## Idea of this task

Every commercial concept in the system attaches to `BillingAccount`.
Getting that entity — with its uniqueness invariant and its resolver
that treats absence as Free — right and shipped first means BE-02..BE-15
can plug into a stable boundary. Backfilling existing users idempotently
lets subsequent tasks assume `BillingAccount` always exists for any
authenticated user.

## Development steps

1. Append the `billing_accounts` table to
   `src/main/resources/database/schema.sql` (idempotent
   `CREATE TABLE IF NOT EXISTS`, unique index on `(owner_user_id, type)`).
2. Append the backfill `INSERT ... SELECT ... WHERE NOT EXISTS` block.
3. Add package `io.backend.lined.billing.domain.account`:
   `BillingAccountEntity`, `BillingAccountRepository`,
   `BillingAccountType`, `BillingAccountStatus`.
4. Add package `io.backend.lined.billing.domain.plan`: `PlanCode` enum.
5. Add package `io.backend.lined.billing.application`:
   `EffectivePlanResolver`, `PaidSubscriptionLookupPort` (interface),
   `NoOpPaidSubscriptionLookup` (default implementation returning
   `Optional.empty()` until BE-06).
6. Wire `AccountApplicationServiceImpl.registerUser` to also call
   `BillingAccountService.ensurePersonalAccount(userId)` inside the same
   `@Transactional` boundary.
7. Add `BillingAccountService.getByOwnerUserId(userId)` for future
   callers (BE-04).
8. Tests (see "Tests to add" below).
9. Run `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- Every existing user has exactly one Personal BillingAccount after
  application startup.
- Registering a new user creates their Personal BillingAccount in the
  same transaction as the user row; no partial state on failure.
- `EffectivePlanResolver.resolve(accountId, now)` returns `FREE` for
  every account today (BE-06 will change the underlying lookup).
- No new HTTP surface added; no user-visible change.
- `./gradlew test`, `./gradlew checkstyleMain`, `./gradlew spotbugsMain`
  pass.

## REST API added / changed

None — see BE-04 for `GET /api/billing/me`.

## Tests to add

- **Unit — `EffectivePlanResolverTest`**: given the stub lookup returns
  empty → resolves to `FREE`; given a stub with a subscription whose
  `currentPeriodEnd` is in the past → resolves to `FREE`; given an
  active subscription with `currentPeriodEnd > now` → resolves to `PRO`
  (uses a synthetic `PaidSubscription` DTO exposed by the port).
- **Unit — `BillingAccountServiceTest`**: `ensurePersonalAccount` is
  idempotent (second call returns the existing account, does not throw
  on unique-index conflict).
- **Integration (Testcontainers) — `BillingAccountRepositoryIT`**:
  unique constraint on `(owner_user_id, PERSONAL)` blocks duplicate
  inserts; backfill SQL produces exactly one row per user.
- **Integration — `AccountApplicationServiceRegistrationIT`**:
  registration creates the user and the Personal BillingAccount
  atomically; when the account insert fails, the user row is rolled
  back.

## Risk & follow-ups

- Backfill is written as raw SQL in `schema.sql`; if/when Flyway or
  Liquibase is introduced, migrate this block first.
- BE-06 replaces `NoOpPaidSubscriptionLookup` with a real
  `SubscriptionRepository`-backed implementation. Until then the
  resolver still ships and everyone is on Free — which matches production
  reality until checkout goes live.
