# Task BE-15 — Reconciliation + Outbox + Notifications + Rollout + Observability

**Branch:** `feature/be-15-reconciliation-outbox-notifications-rollout`

*Depends on BE-11 (subscription events), BE-12 (downgrade events),
BE-13 (refund events), BE-14 (permission model + audit log). Last
task — closes out §57 Definition of Done.*

## Detailed description

Ship the remaining operational, observability, and rollout mechanics
so billing can be enabled safely for allowlisted users, then publicly.

Scope:

1. **Reconciliation** — daily job:
   - candidate selection per §23.3: `ACTIVE` with elapsed
     `currentPeriodEnd`, `PAST_DUE` subs, subs with `last_synced_at <
     now - 24h`, subs referenced by FAILED inbox events, subs manually
     flagged
   - for each candidate, call `BillingReconciliationProvider.getSubscriptionSnapshot`,
     compare with local, apply drift, write to `billing_audit_log`
     (reason: `RECONCILIATION_DRIFT`)
   - update `last_synced_at` on each processed row
   - metric `billing_reconciliation_drift_total` +
     `billing_reconciliation_failed_total`
2. **Outbox** — replace BE-11's in-process event bus with a durable
   outbox table:
   - `billing_domain_events` table: `id`, `aggregate_type`,
     `aggregate_id`, `event_type`, `payload_json`, `occurred_at`,
     `processed_at` (nullable), `attempt_count`, `last_error`
   - `OutboxPublisher` (`@Scheduled`) picks up unpublished rows and
     delivers via a `DomainEventPublisher` interface to in-process
     subscribers (entitlement handler, lobby archive events,
     notification service)
   - Publishing is at-least-once; consumers must be idempotent
     (already true for BE-12's handler and BE-15's notification
     service).
3. **Notifications** — templates for §36.1 (billing) and §36.2 (lobby
   lifecycle) events. `BillingNotificationSubscriber` listens on the
   outbox, renders `NotificationEntity` rows for in-app inbox + email
   dispatch (uses existing `notification` module patterns):
   - `payment_successful`, `subscription_activated`,
     `cancellation_scheduled`, `cancellation_resumed`,
     `price_change_scheduled`, `renewal_failed`,
     `grace_period_expires_soon`, `payment_recovered`,
     `subscription_expired`, `refund_requested`, `refund_completed`,
     `refund_failed`
   - `lobby_read_only`, `owner_must_select_free_lobby`,
     `lobby_will_be_archived`, `lobby_archived`, `lobby_restored`,
     `pro_restored_restrictions_removed`
   - Delivery scheduling per §36.4 (grace warnings at 0h and grace-24h;
     archive warnings at downgrade, deadline-7d, deadline-1d)
   - Jobs are idempotent (dedup by `(subscription_id, event_type,
     bucket)`)
4. **Feature flags & rollout** — Spring properties + `billing_beta_accounts`
   table + gate:
   - `billing.ui.enabled` (boolean) — surfaced in
     `GET /api/billing/me` as a flag; UI hides the whole billing
     surface when false
   - `billing.checkout.enabled` (boolean) — `POST /api/billing/checkout`
     returns 403 `BILLING_DISABLED` when false
   - `billing.rollout.mode` — enum `DISABLED|ALLOWLIST|PUBLIC`; when
     `ALLOWLIST`, both `enabled` flags require the caller's
     BillingAccount to be in `billing_beta_accounts`
   - Admin endpoints under `billing/api/admin/`:
     `POST /api/admin/billing/beta-accounts` and `DELETE` with
     `BILLING_OPS` permission
   - `billing.provider` **must never be `sandbox` in `prod` profile** —
     enforce at startup (design §52 Phase 5 kill switch).
   - Webhook processing (BE-09) is **not** gated by these flags — it
     always runs (design §18.2).
5. **Metrics** — Micrometer counters + timers from §50.1. Register in a
   central `BillingMetrics` bean and increment from each handler.
6. **Structured logs** — MDC entries per §50.2 (`correlationId`,
   `provider`, `providerEventId`, `billingAccountId`, `subscriptionId`,
   `operation`).
7. **Alerts** — document alert queries in `docs/billing/OBSERVABILITY.md`
   (webhook failures, invalid signatures, drift, provider API error
   rate, stale PAST_DUE, ACTIVE with elapsed period, refund failures,
   outbox backlog, archive job failures).
8. **Legacy cleanup** — after ~1 release cycle: `DROP TABLE
   user_subscriptions`. Deferred to a follow-up so this task doesn't
   block on that timing.
9. **ArchUnit slice test** — cycle-free slices per §54:
   `slices().matching("io.backend.lined.(*)..").should().beFreeOfCycles()`.

## Design references

- §18 Feature Flags and Rollout
- §22.4 Webhook always processes
- §23 Reconciliation
- §24 (outbox events list)
- §36 Notifications
- §43.1 Outbox events
- §50 Observability
- §52 Rollout plan phases
- §54 Architecture Enforcement
- §57 Definition of Done

## Idea of this task

Everything above BE-15 assumes there is a way to (a) detect drift when
webhooks are missed, (b) turn the whole surface off/on for a subset of
users, (c) tell users what happened. Landing all three in one task
means the "Definition of Done" isn't held up by scope splinters.

## Development steps

1. Append `billing_domain_events`, `billing_beta_accounts` DDL to
   `schema.sql`.
2. Add `OutboxService.publish(event)` + `OutboxPublisher`
   (`@Scheduled`).
3. Migrate BE-11's `subscriptionEventBus.publish(...)` calls to
   `outboxService.publish(...)`.
4. Add `ReconciliationJob` (`@Scheduled(cron="0 30 4 * * *")`) +
   `ReconciliationService` + audit writes.
5. Wire `AdminBillingController.resync` (BE-14) to
   `ReconciliationService.reconcileOne(billingAccountId)`.
6. Add `BillingNotificationSubscriber` listening on outbox event
   types.
7. Add feature-flag gates: `BillingFeatureFlags` component reads
   properties + allowlist; used in
   `BillingCheckoutController` and returned from `GET /api/billing/me`.
8. Add `billing/infrastructure/config/BillingProviderProfileGuard`
   (fails startup when prod + sandbox).
9. Add `BillingMetrics` bean + increment sites in every handler.
10. Add MDC filter for structured logs.
11. Write `docs/billing/OBSERVABILITY.md` with alert queries.
12. Add ArchUnit slice test.
13. Tests.
14. Run `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- Daily reconciliation runs and repairs drift; drift shows up as
  metrics + audit log entries.
- All subscription/refund events go through the durable outbox — a
  restart mid-processing never drops an event.
- Users receive notifications for the events listed in §36.
- Flipping `billing.rollout.mode=PUBLIC` (in a follow-up rollout PR)
  reveals the full billing UI to everyone; `ALLOWLIST` restricts to
  `billing_beta_accounts`.
- Prod deploy with `billing.provider=sandbox` fails to start.
- Micrometer scrape shows the counters from §50.1.
- ArchUnit slice test passes.
- `./gradlew test`, `./gradlew checkstyleMain`, `./gradlew spotbugsMain`
  pass.

## REST API added / changed

| Purpose | Method + Path |
|---|---|
| DTO change | `GET /api/billing/me` now includes `rollout: { uiEnabled, checkoutEnabled }` for UI-38 to consume |
| Add beta account | `POST /api/admin/billing/beta-accounts` (body `{ billingAccountId, expiresAt?, reason }`) |
| Remove beta account | `DELETE /api/admin/billing/beta-accounts/{billingAccountId}` |

## Tests to add

- **Integration — `ReconciliationJobIT`**: seeded ACTIVE local with
  provider snapshot `CANCELED` → local flips to CANCELED, drift audit
  log written, `billing_reconciliation_drift_total` incremented.
- **Integration — `OutboxPublisherIT`**: event inserted in a
  transaction that rolls back → not published; committed → published
  exactly once; publisher crash mid-batch → next run publishes
  remainder.
- **Integration — `NotificationEmissionIT`**: subscription activation
  outbox event → single in-app notification created; grace-warning
  scheduling is idempotent (running twice → still one notification per
  bucket).
- **Controller — `RolloutGateTest`**: `billing.checkout.enabled=false`
  → 403 `BILLING_DISABLED`; `mode=ALLOWLIST` + not on allowlist → 403;
  same + allowlisted → 200.
- **Startup — `SandboxInProdRefusalTest`**: `spring.profiles.active=prod`
  + `billing.provider=sandbox` → application context fails to start.
- **Architecture — `BillingSliceCycleTest`**: no package cycles.

## Risk & follow-ups

- Reconciliation is O(rows) per day. If subscription volume grows
  substantially, add pagination + parallelism.
- Notification retries currently rely on the existing `notification`
  module's retry — verify it exists; if not, add a small
  `NotificationRetryJob`.
- Dropping `user_subscriptions` is intentionally deferred; add a
  follow-up ticket referencing this task.
- The webhook processor (BE-09) runs on the same instance as
  reconciliation and outbox publisher; if that becomes a hot spot,
  split them into their own thread pools.
