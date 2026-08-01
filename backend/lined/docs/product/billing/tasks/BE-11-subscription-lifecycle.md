# Task BE-11 — Subscription Lifecycle (Activate / Cancel / Resume / Change / Grace)

**Branch:** `feature/be-11-subscription-lifecycle`

*Depends on BE-06 (subscription table + state machine), BE-07/BE-08
(ports + sandbox), BE-09 (webhook inbox), BE-10 (checkout). Blocks
BE-12 (downgrade), BE-13 (refund path).*

## Detailed description

Wire up the full subscription lifecycle from confirmed webhook → ACTIVE
→ user-initiated cancel/resume/change-price at period end → PAST_DUE
(grace) → recovery / expiration. Publishes domain events for BE-12 and
BE-15 to consume.

Scope:

1. Webhook event handlers under `billing/application/event/`
   registered with BE-09's dispatcher for the sandbox event types (real
   provider events map through the adapter to the same canonical
   event enum):
   - `PAYMENT_CONFIRMED` → upsert subscription row: `status=ACTIVE`,
     `current_period_start/end`, `current_price_code`,
     `provider_updated_at`, `version+=1`. If no row exists, insert;
     enforces the partial unique index on non-terminal subs (see
     BE-06)
   - `PAYMENT_FAILED` → `ACTIVE → PAST_DUE`, set `past_due_since`,
     set `grace_ends_at = failure_effective_time + 3 days`
   - `PAYMENT_RECOVERED` → `PAST_DUE → ACTIVE`, clear past_due /
     grace fields
   - `PROVIDER_EXPIRED` → `PAST_DUE → EXPIRED` or `ACTIVE → EXPIRED`
   - `PERIOD_ELAPSED` → for `ACTIVE + cancelAtPeriodEnd=true` → move
     to `CANCELED`; for `ACTIVE + scheduledPriceCode` → apply the
     price change and start a fresh period
2. User-initiated endpoints (all derive account from `X-User-Id`):
   - `POST /api/billing/subscription/cancel` — calls
     `subscriptionProvider.scheduleCancellation(id, currentPeriodEnd)`,
     locally sets `cancel_at_period_end=true`, `scheduled_change_at =
     currentPeriodEnd`. Rejects with `SUBSCRIPTION_NOT_ACTIVE` when
     not `ACTIVE`; `CANCELLATION_ALREADY_SCHEDULED` when already true.
   - `POST /api/billing/subscription/resume` — requires `ACTIVE +
     cancel_at_period_end=true + now < currentPeriodEnd`; calls
     `subscriptionProvider.resumeSubscription`, clears the local
     scheduled fields. `RESUME_NOT_ALLOWED` otherwise.
   - `POST /api/billing/subscription/change-price` (body:
     `{ priceCode }`) — server-side maps `PriceCode → providerPriceId`;
     calls `subscriptionProvider.schedulePriceChange(id,
     nextPriceId, currentPeriodEnd)`; local writes
     `scheduled_price_code`, `scheduled_change_at`.
     `PRICE_CHANGE_ALREADY_SCHEDULED` on duplicate; also allowed
     while `cancel_at_period_end=true` because it implicitly resumes
     (design §26 is silent on this — reject with
     `RESUME_NOT_ALLOWED` and require the user to resume first).
3. `GET /api/billing/me` (from BE-04) now populates the `subscription`
   field with `{ status, priceCode, currentPeriodEnd,
   cancelAtPeriodEnd, scheduledPriceCode, graceEndsAt }`.
4. Every write publishes a domain event via BE-15's outbox (the outbox
   table is delivered by BE-15; this task publishes to an in-process
   event bus and TODO-marks the outbox integration). Events:
   `SUBSCRIPTION_ACTIVATED`, `SUBSCRIPTION_CANCELLATION_SCHEDULED`,
   `SUBSCRIPTION_CANCELLATION_RESUMED`,
   `SUBSCRIPTION_PRICE_CHANGE_SCHEDULED`,
   `SUBSCRIPTION_PAYMENT_FAILED`,
   `SUBSCRIPTION_PAYMENT_RECOVERED`,
   `SUBSCRIPTION_EXPIRED`, `EFFECTIVE_PLAN_CHANGED`.
5. All operations use optimistic locking (BE-06 `version` column).
   Conflict resolution: reload subscription, if the requested change is
   already applied return idempotent success; otherwise return `409
   PROVIDER_STATE_CONFLICT`.

## Design references

- §14 Statuses
- §15 State Machine
- §21 Upgrade Activation
- §24 Upgrade Activation sequence
- §25 Cancellation and Resume
- §26 Monthly / Yearly Interval Changes
- §27 Failed Payment and Grace Period
- §37.4–.6 REST endpoints
- §42.3 Subscription transitions

## Idea of this task

This is where the state machine from BE-06 meets real events. Keeping
every state change flowing through `SubscriptionStateMachine.assertTransition`
means the reachability of every canonical status is provably correct.
Every action (webhook or user) becomes: load, assert-transition, mutate,
publish event, save (with optimistic lock).

## Development steps

1. Add event handlers implementing `ProviderEventHandler` for each
   sandbox event type; register them with the dispatcher (BE-09).
2. Add `SubscriptionCommandService`:
   `cancel(userId)`, `resume(userId)`, `changePrice(userId, priceCode)`.
   Each: load `BillingAccount → active subscription`, assert-transition,
   call provider port, update local row, publish event.
3. Add `SubscriptionEventBus` (Spring `ApplicationEventPublisher` for
   now; BE-15 replaces with outbox).
4. Add endpoints in `BillingSubscriptionController`.
5. Extend `BillingController.getMe(...)` (BE-04) to fill the
   `subscription` field.
6. Add scheduled `PeriodElapsedJob` (design §15) that runs hourly and
   applies `PERIOD_ELAPSED` events to subs with `currentPeriodEnd <
   now` (belt-and-braces alongside provider webhooks that would fire
   `RENEWAL_SUCCEEDED` / `EXPIRED`).
7. Tests.
8. Run `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- Webhook `PAYMENT_CONFIRMED` moves the account from FREE to PRO on
  next `GET /api/billing/me`.
- Cancel / resume / change-price endpoints work per design; illegal
  transitions return stable error codes.
- PAST_DUE persists for 3 days; effective plan stays PRO during grace
  via `EffectivePlanResolver`, drops to FREE after `graceEndsAt`.
- `PeriodElapsedJob` cleans up subs whose period elapsed without a
  provider event (safety net).
- `./gradlew test`, `./gradlew checkstyleMain`, `./gradlew spotbugsMain`
  pass.

## REST API added / changed

| Purpose | Method + Path |
|---|---|
| Cancel at period end | `POST /api/billing/subscription/cancel` |
| Resume scheduled cancellation | `POST /api/billing/subscription/resume` |
| Change interval at period end | `POST /api/billing/subscription/change-price` |
| DTO change | `GET /api/billing/me` `subscription` field now populated when a subscription exists |

## Tests to add

- **Unit — `SubscriptionCommandServiceTest`**: cancel/resume/change
  happy paths; illegal transitions return stable codes; optimistic
  lock conflict returns idempotent success when the target state is
  already applied.
- **Integration — `WebhookPaymentConfirmedIT`** (sandbox + processor):
  synthesize `PAYMENT_CONFIRMED` → row appears, `GET /api/billing/me`
  reports PRO.
- **Integration — `PastDueGraceIT`**: `PAYMENT_FAILED` → PAST_DUE +
  grace; `EffectivePlanResolver` returns PRO during grace, FREE after.
- **Integration — `PeriodElapsedJobIT`**: ACTIVE+`cancelAtPeriodEnd`
  with elapsed period → CANCELED after job runs.
- **Controller — `BillingSubscriptionControllerTest`**: 401 without
  `X-User-Id`; 409 on illegal cancel/resume/change; 200 on happy path.
- **Controller — `BillingMeSubscriptionShapeTest`**: field shape
  matches §37.1 example.

## Risk & follow-ups

- `PeriodElapsedJob` and provider webhook can race. State machine +
  optimistic lock make this safe: whichever writes second sees a
  version mismatch and re-checks the current state.
- Real provider event mapping (Stripe `invoice.payment_failed` etc.)
  happens in the future adapter — canonical event names are stable.
- BE-15's outbox replaces the in-process event bus; the handler
  contract stays the same.
