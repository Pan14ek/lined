# Billing Implementation Task Plan

This plan turns the target architecture defined in
[`subscription-billing-system-design.md`](../../../..//Downloads/subscription-billing-system-design.md)
(the design doc, 60 sections) into concrete backend work. It splits the MVP
into 15 deliverable slices that follow §58 "Recommended Implementation Order"
of the design.

**For AI agents (Claude Code, Codex, Gemini, etc.):** read the root
`AGENTS.md` and `backend/lined/CLAUDE.md` first — every rule in there
applies. Summary: one task per branch/PR using the branch name below; read
the linked task file fully before coding; respect dependencies; update the
Status column (`TODO` → `IN PROGRESS` → `DONE`) in the same PR; don't
expand scope beyond the task file.

## Current state (before this plan)

- `plan/` module: mutable `PlanEntity` + public `POST /api/plans` CRUD
- `subscription/` module: `POST /api/subscriptions { userId, planId, … }`
  (trusts client), `POST /api/subscriptions/{userId}/cancel-active`,
  `GET /api/subscriptions/{userId}/{active|history}`
- Registration seeds FREE via `AccountApplicationServiceImpl.registerUser`
- `BuiltInPlan { FREE, PRO, FAMILY }`; `BuiltInRole { USER, ADMIN }` — the
  ADMIN role is never gate-checked in code
- Auth is `@RequestHeader("X-User-Id") Long currentUserId` on each
  controller — no Spring Security filter chain
- Schema is a single `resources/database/schema.sql` applied by Spring
  `sql.init` — no Flyway/Liquibase
- Lobbies have owner + members but **no** archived/read-only fields, and
  **no** lobby-count or member-count limits are enforced

The design doc's §2 has the same summary with more detail.

## Target module map

```text
io.backend.lined
├── billing                  (new)
│   ├── api          — web / admin / webhook controllers
│   ├── application  — checkout, subscription, refund, reconciliation, event
│   ├── domain       — account, plan, price, subscription, transaction, refund, event
│   ├── port         — provider ports (checkout, subscription, refund, portal, pricing, reconciliation)
│   └── infrastructure/provider/{sandbox,…}
├── entitlement              (new)
│   ├── api          — effective-plan API surface for other modules
│   ├── application  — resolver, capability checks, limit evaluation
│   └── domain       — PlanEntitlements, EntitlementCode enum
├── lobby            (extended)
│   ├── domain       — lifecycle status, access mode, restriction reason
│   └── application  — reduction workflow, archive job
├── user             (touched)   — permission model, BillingAccount owner_user_id back-ref
├── notification     (touched)   — billing/lobby-lifecycle templates
└── admin            (extended)  — admin billing operations, audit log
```

## Conventions for every backend task

- **Layering:** Controller → Service → Repository → Entity. No cross-layer
  shortcuts. Cross-module calls use explicit contracts or domain events;
  provider DTOs never leak out of `billing.infrastructure.provider`.
- **Transactions:** `@Transactional` from `jakarta.transaction`, not
  Spring's. Never keep a DB transaction open across an external provider
  call — persist local intent, call provider with idempotency, treat
  webhook/reconciliation as authoritative correction.
- **Lookups:** `common.EntityFinder.getOrThrow(...)`; never bare
  `Optional.get()`.
- **Exceptions:** `common.exception.NotFoundException` (404),
  `ConflictException` (409), `BadRequestException` (400),
  `ForbiddenException` (403), `PreconditionRequiredException` (428).
  Stable error codes from design §46 must be surfaced by
  `GlobalExceptionHandler` where the design specifies them.
- **Persistence:** JPA `FetchType.LAZY` always; enums as
  `EnumType.STRING`; timestamps as `OffsetDateTime` (UTC in DB) —
  billing domain-internal timestamps are `java.time.Instant` per design
  §45, converted at the persistence boundary.
- **Schema:** append idempotent `CREATE TABLE IF NOT EXISTS` +
  `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` to
  `src/main/resources/database/schema.sql` for now (matches project
  convention). If Flyway/Liquibase is adopted mid-flight, the outstanding
  billing tasks must be migrated to that tool in one PR — do not mix.
- **Auth:** every user-facing endpoint reads `X-User-Id` and resolves the
  BillingAccount from the authenticated principal — never accept a
  `{userId}` path segment or body field. Admin endpoints additionally
  require role/permission checks introduced by BE-14.
- **Idempotency & concurrency:** subscription writes use optimistic
  locking with a `version` column; webhook processing is deduplicated by
  `(provider, provider_event_id)`; checkout creation is scoped by
  `Idempotency-Key`.
- **Time source:** provider timestamps are canonical for `currentPeriodStart`,
  `currentPeriodEnd`, refund `occurredAt`. Never compute `plusDays(30)`
  for a monthly period.
- **Tests:** every service behaviour has a JUnit 5 unit test; every new
  table has a Testcontainers-backed repository test; controllers have a
  `@SpringBootTest`/`@WebMvcTest` counterpart. Do not delete tests to
  raise coverage; do not suppress SpotBugs without a comment.
- **Checkstyle:** methods ≤ 50 lines, 2-space indent, braces required.
- **Sensitive data:** never log card data, raw secret headers, full
  provider payloads with secrets, or access tokens. Provider event
  payloads are stored as `JSONB` but logs must be sanitized.

## Task table

| # | Branch name | Task description | Reference | Status |
|---|---|---|---|---|
| BE-01 | `feature/be-01-billing-account-effective-plan` | Introduce `BillingAccount` (Personal), backfill for existing users, `EffectivePlanResolver` returning implicit FREE | [tasks/BE-01-billing-account-effective-plan.md](tasks/BE-01-billing-account-effective-plan.md) | TODO |
| BE-02 | `feature/be-02-entitlement-module-free-limits` | `entitlement` module: `PlanEntitlements` (Free 1×4, Pro 10×20), capability checks, enforce Free limits in lobby create + invite accept | [tasks/BE-02-entitlement-module-free-limits.md](tasks/BE-02-entitlement-module-free-limits.md) | TODO |
| BE-03 | `feature/be-03-lobby-lifecycle-access-mode` | Lobby lifecycle status + access mode + restriction reason + `archiveAt`; select-as-free / restore / archived-list endpoints | [tasks/BE-03-lobby-lifecycle-access-mode.md](tasks/BE-03-lobby-lifecycle-access-mode.md) | TODO |
| BE-04 | `feature/be-04-remove-legacy-billing-endpoints` | Remove unsafe prototype endpoints; add secured `GET /api/billing/me` derived from the authenticated principal | [tasks/BE-04-remove-legacy-billing-endpoints.md](tasks/BE-04-remove-legacy-billing-endpoints.md) | TODO |
| BE-05 | `feature/be-05-billing-catalog-plans-prices` | New `billing_plans` + `billing_prices` catalog with server-side `PriceCode` → `providerPriceId` mapping | [tasks/BE-05-billing-catalog-plans-prices.md](tasks/BE-05-billing-catalog-plans-prices.md) | TODO |
| BE-06 | `feature/be-06-subscription-schema-state-machine` | `billing_subscriptions` + `billing_provider_customers` tables, entity, optimistic locking, state machine helper | [tasks/BE-06-subscription-schema-state-machine.md](tasks/BE-06-subscription-schema-state-machine.md) | TODO |
| BE-07 | `feature/be-07-provider-port-abstraction` | Provider port interfaces + canonical DTOs + `BillingProviderCapabilities`; ArchUnit rule blocks provider DTO leakage | [tasks/BE-07-provider-port-abstraction.md](tasks/BE-07-provider-port-abstraction.md) | TODO |
| BE-08 | `feature/be-08-sandbox-stub-provider-adapter` | Deterministic in-memory sandbox adapter satisfying every port; provider selection matrix (§19.5) documented as TBD | [tasks/BE-08-sandbox-stub-provider-adapter.md](tasks/BE-08-sandbox-stub-provider-adapter.md) | TODO |
| BE-09 | `feature/be-09-webhook-inbox-signature` | `billing_provider_events` table + `POST /api/billing/webhooks/{provider}` with signature verification, idempotent insert, async processor | [tasks/BE-09-webhook-inbox-signature.md](tasks/BE-09-webhook-inbox-signature.md) | TODO |
| BE-10 | `feature/be-10-checkout-endpoint-pricing-preview` | `billing_checkout_attempts` + `POST /api/billing/checkout` + `GET /api/billing/prices` + lazy provider-customer creation | [tasks/BE-10-checkout-endpoint-pricing-preview.md](tasks/BE-10-checkout-endpoint-pricing-preview.md) | TODO |
| BE-11 | `feature/be-11-subscription-lifecycle` | Activation from webhook + cancel/resume/change-price endpoints + PAST_DUE grace/expiration lifecycle | [tasks/BE-11-subscription-lifecycle.md](tasks/BE-11-subscription-lifecycle.md) | TODO |
| BE-12 | `feature/be-12-downgrade-archive-workflow` | Pro→Free downgrade: excess lobbies READ_ONLY + 30d archive scheduled job + reduction-write whitelist + restore | [tasks/BE-12-downgrade-archive-workflow.md](tasks/BE-12-downgrade-archive-workflow.md) | TODO |
| BE-13 | `feature/be-13-transactions-refunds-admin` | `billing_transactions` + `billing_refunds` + admin refund preview/issue + `BILLING_REFUND` permission | [tasks/BE-13-transactions-refunds-admin.md](tasks/BE-13-transactions-refunds-admin.md) | TODO |
| BE-14 | `feature/be-14-admin-billing-api-audit` | Admin search/view/resync/retry-event + `billing_audit_log` + minimal permission model with `@RequiresPermission` interceptor | [tasks/BE-14-admin-billing-api-audit.md](tasks/BE-14-admin-billing-api-audit.md) | TODO |
| BE-15 | `feature/be-15-reconciliation-outbox-notifications-rollout` | Daily reconciliation + outbox events + notification templates + feature-flag rollout modes + Micrometer metrics + ArchUnit slice test | [tasks/BE-15-reconciliation-outbox-notifications-rollout.md](tasks/BE-15-reconciliation-outbox-notifications-rollout.md) | TODO |

## Suggested implementation order

Following design §58, the safe sequence is:

1. **Foundation (BE-01 → BE-04):** BillingAccount + entitlements + lobby
   lifecycle + remove the unsafe legacy prototype APIs. Ship each in its
   own PR; nothing paid exists yet, and after BE-04 the surface is
   provider-neutral and safe.
2. **Catalog + subscription domain (BE-05 → BE-06):** persistence for
   plans, prices, subscriptions, provider mappings.
3. **Provider seam (BE-07 → BE-08):** define the ports first, then ship a
   sandbox adapter so BE-09..BE-13 can be developed and tested without a
   real provider account.
4. **Money-adjacent surface (BE-09 → BE-11):** webhooks, checkout,
   pricing preview, subscription lifecycle. Nothing here should be
   customer-visible until BE-15 flips the rollout flag.
5. **Consequences (BE-12 → BE-13):** downgrade/archive + refunds.
6. **Operations (BE-14 → BE-15):** admin surface + reconciliation +
   observability + rollout. BE-15 gates the whole subsystem behind
   `billing.rollout.mode`.

## Provider selection

Provider is deliberately **TBD** — see design §5, §19, §56 open decision
#1. BE-07 defines a provider-agnostic port surface; BE-08 ships an
in-memory sandbox adapter so every subsequent task is testable without
provider credentials. The production adapter (Paddle / Stripe / Mono /
other) is a follow-up task not scheduled here: it re-implements the
sandbox contract and passes the same test suite from BE-07.

## Definition of Done for the billing MVP

Mirrors design §57. The MVP is complete only when:

- every user has a Personal BillingAccount
- Free is implicit; Free limits are enforced
- Pro prices support monthly and yearly
- checkout is provider-controlled
- Pro activation requires a verified webhook
- webhook events are idempotent and auditable
- cancel/resume/change-price all apply at `currentPeriodEnd`
- PAST_DUE + 3-day grace + expiration to implicit Free
- over-limit lobbies are read-only, then archived after 30 days
- refund administration requires `BILLING_REFUND`
- daily reconciliation runs; manual resync is available
- public APIs use authenticated ownership; admin APIs are protected
- provider contract tests, security tests, and concurrency tests pass
- audit logs and operational metrics exist
- legacy direct subscription activation is removed; Family plan is out
