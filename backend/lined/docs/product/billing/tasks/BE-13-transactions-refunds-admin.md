# Task BE-13 — Transactions + Refunds + Admin Refund Flow

**Branch:** `feature/be-13-transactions-refunds-admin`

*Depends on BE-06 (subscription), BE-09 (webhook inbox handles refund
events), BE-11 (subscription lifecycle publishes activation-related
events), BE-14 (permission model — land BE-14 first if the
`@RequiresPermission` interceptor is not yet available; otherwise ship
the two together).*

## Detailed description

Persist billing transactions from payment/refund webhooks; expose admin
endpoints to preview and issue refunds, gated by the new
`BILLING_REFUND` permission. Provider is authoritative — a refund is
`SUCCEEDED` only after the refund webhook confirms it.

Scope:

1. New tables:
   - `billing_transactions` per design §12.7:
     `id`, `billing_account_id`, `subscription_id` (nullable),
     `provider_transaction_id` (unique), `provider_price_id`,
     `amount_minor`, `currency`, `tax_minor` (nullable), `status`,
     `occurred_at`, `created_at`
   - `billing_refunds` per design §12.8:
     `id`, `transaction_id` FK, `provider_refund_id` (nullable, unique
     when set), `type` (`FULL|PARTIAL|PRORATED_UNUSED_TIME`),
     `amount_minor`, `currency`, `status`
     (`REQUESTED|PENDING|SUCCEEDED|FAILED|REJECTED`),
     `reason_code`, `reason_text`, `access_behavior`
     (`KEEP_ACCESS_UNTIL_PERIOD_END|END_ACCESS_AFTER_REFUND`),
     `requested_by_user_id`, `provider_updated_at`, timestamps
2. Webhook handlers under `billing/application/event/`:
   - `TRANSACTION_SUCCEEDED` → insert transaction row (idempotent on
     `provider_transaction_id`)
   - `REFUND_SUCCEEDED` → mark refund `SUCCEEDED`, apply
     `access_behavior`: `END_ACCESS_AFTER_REFUND` publishes
     `EFFECTIVE_PLAN_CHANGED PRO→FREE`
   - `REFUND_FAILED` → mark refund `FAILED` (retryable via BE-14 admin
     endpoint)
3. Admin endpoints under `billing/api/admin/`:
   - `POST /api/admin/billing/transactions/{transactionId}/refund-preview`
     — requires `BILLING_REFUND`; returns
     `RefundPreview` from `BillingRefundProvider.previewRefund(...)`:
     max refundable, currency, whether provider requires review
   - `POST /api/admin/billing/transactions/{transactionId}/refunds`
     — requires `BILLING_REFUND`; body:
     `{ type, amountMinor, currency, reasonCode, reasonText?,
     accessBehavior, idempotencyKey }`
   - Validation: `amount > 0`; `amount ≤ providerRefundable`;
     `currency == transaction.currency`; not already fully refunded;
     `PRORATED_UNUSED_TIME` defaults `accessBehavior=END_ACCESS_AFTER_REFUND`
4. User-facing history endpoints:
   - `GET /api/billing/transactions` (auth-derived, paginated)
   - `GET /api/billing/refunds` (auth-derived, paginated)
5. Every admin action writes to `billing_audit_log` (table introduced
   in BE-14).
6. Product refund policy (design §31.1) is enforced as a **check
   surfaced in the preview response**, not a hard block on the issue
   endpoint — the design allows exceptional Admin overrides (§32).
   Preview returns `withinDefaultWindow` boolean; UI-50 uses it.

## Design references

- §12.7 `billing_transactions`
- §12.8 `billing_refunds`
- §31 Refund Policy
- §32 Refund Eligibility Decision
- §33 Full Refund Sequence
- §34 Partial Refund Sequence
- §35 Refund Failure and Retry
- §40.5–40.6 Admin refund endpoints
- §41.3 Admin authorization
- §42.5 Refund idempotency

## Idea of this task

Refunds combine three sources of truth: the transaction (what was
charged), the product policy (window + admin discretion), and the
provider (final financial state). Splitting into "preview" (which
consults the provider for the max refundable amount and the policy for
eligibility) and "issue" (which persists intent, calls the provider
with idempotency, then waits for the webhook) is the only pattern that
avoids double refunds when a provider response times out.

## Development steps

1. Append `billing_transactions` and `billing_refunds` DDL to
   `schema.sql`.
2. Add entities + repositories under `billing/domain/transaction/` and
   `billing/domain/refund/`.
3. Add `TransactionEventHandler` and `RefundEventHandler` implementing
   BE-09's `ProviderEventHandler`.
4. Add `AdminBillingRefundController` under `billing/api/admin/`;
   annotate with `@RequiresPermission("BILLING_REFUND")` (interceptor
   from BE-14).
5. Add `RefundService.preview(transactionId)` and
   `RefundService.issue(transactionId, RefundCommand)`.
6. Add `BillingHistoryController` under `billing/api/web/` for user
   `GET /api/billing/transactions|refunds` (derives account from the validated
   Bearer subject through `CurrentUserProvider`).
7. Tests.
8. Run `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- Payment webhook creates a `billing_transactions` row visible via
  `GET /api/billing/transactions` for the paying user.
- Admin can preview a refund (returns max amount from provider +
  within-window flag) and issue it; issue persists REQUESTED, calls
  provider with idempotency, moves to PENDING; webhook then
  SUCCEEDED / FAILED.
- FAILED refunds can be retried via BE-14's `retry-failed-event` (does
  not create a duplicate provider refund because the same
  `providerRefundId` is passed).
- Non-admin caller of admin endpoints: 403.
- Admin without `BILLING_REFUND`: 403.
- `./gradlew test`, `./gradlew checkstyleMain`, `./gradlew spotbugsMain`
  pass.

## REST API added / changed

| Purpose | Method + Path |
|---|---|
| List my transactions | `GET /api/billing/transactions?page=&size=` |
| List my refunds | `GET /api/billing/refunds?page=&size=` |
| Admin refund preview | `POST /api/admin/billing/transactions/{transactionId}/refund-preview` |
| Admin issue refund | `POST /api/admin/billing/transactions/{transactionId}/refunds` (body per above) |

## Tests to add

- **Unit — `RefundServiceTest`**: preview returns provider max and
  within-window flag; issue rejects amount 0 / above max / wrong
  currency; issue persists REQUESTED and returns immediately.
- **Integration — `RefundIssueThenWebhookIT`**: admin issue → REQUESTED
  → `REFUND_SUCCEEDED` synthetic webhook → SUCCEEDED and effective
  plan flips per `accessBehavior`.
- **Integration — `RefundWebhookIdempotencyIT`**: duplicate
  `REFUND_SUCCEEDED` webhooks → single terminal state, no double
  application to lobbies.
- **Controller — `AdminRefundControllerAuthTest`**: user without
  ADMIN role → 403; ADMIN without `BILLING_REFUND` permission → 403;
  full-permission ADMIN → 200.
- **Controller — `BillingHistoryControllerTest`**: user sees only
  their own transactions/refunds; pagination bounds respected.

## Risk & follow-ups

- Immediate-status providers (returning `SUCCEEDED` synchronously)
  still round-trip through the webhook path — the webhook may fire
  again as confirmation; state stays SUCCEEDED (idempotent).
- If the transaction currency differs from the request currency,
  400 `REFUND_AMOUNT_INVALID` with a clear message. Currency conversion
  is out of scope.
