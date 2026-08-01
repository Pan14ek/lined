# Superseded — Payment Checkout (Hosted Provider)

> Superseded by the provider-neutral billing delivery plan in
> [`docs/product/billing/BILLING_TASKS.md`](../BILLING_TASKS.md), especially BE-07 through BE-11.
> That sequence replaces the removed client-controlled `/api/subscriptions` model with catalog,
> provider-port, webhook-inbox, checkout, and lifecycle slices. Do not implement this proposal.

This document is retained only as historical context for the original hosted-checkout rationale.

**Branch:** `feature/payment-checkout-api`
**Status:** Superseded by `docs/product/billing/BILLING_TASKS.md`
**Motivation:** The subscription domain is complete (`GET /api/plans`,
`POST /api/subscriptions`, cancel/active/history) but entirely unpaid —
`POST /api/subscriptions` activates any plan for free. Before Premium can
mean anything, subscribing must go through a real payment, and the web
Subscription page (UI task 14, extended by UI task 26) needs a flow to
drive.

## Design decision: hosted checkout, not card collection

Lined should **never touch card data**. The standard, lowest-risk flow is a
provider-hosted checkout page (Stripe Checkout; LiqPay/Fondy are the
equivalent for the Ukrainian market — the provider adapter should be an
interface): the backend creates a checkout session, the client redirects to
the provider, the provider redirects back and confirms via webhook. This
keeps Lined out of PCI DSS scope entirely and gives users a payment page
they already trust.

## What the API should do

```
POST /api/payments/checkout-sessions
Body: { "planId": 2, "billingPeriod": "MONTHLY" | "YEARLY",
        "successUrl": "...", "cancelUrl": "..." }
→ 201 { "sessionId": "cs_...", "checkoutUrl": "https://provider/..." }
    409 when the caller already has an active paid subscription

GET /api/payments/checkout-sessions/{sessionId}
→ 200 { "status": "PENDING" | "COMPLETED" | "EXPIRED" | "CANCELLED",
        "subscriptionId": 123 | null }
    (client polls this on the success-return page until COMPLETED)

POST /api/payments/webhook        (provider → backend, signature-verified)
→ activates the subscription (creates the UserSubscription the existing
  endpoints already model), records a PaymentDto, emits a notification

GET /api/payments/history
→ 200 PaymentDto[] { id, planName, billingPeriod, amountCents, currency,
                     status: PAID | REFUNDED | FAILED, paidAt, receiptUrl }
```

- `POST /api/subscriptions` becomes free-plan/dev-only (or is gated off in
  production) — paid plans activate **only** via the webhook path, so a
  user cannot self-grant Premium.
- Cancellation reuses the existing
  `POST /api/subscriptions/{userId}/cancel-active` — v1 semantics: no
  refund, plan stays active until the period end (`endsAt` on the
  subscription; add the field if absent).
- `receiptUrl` points at the provider's hosted receipt — no PDF generation
  in v1.
- Webhook must be idempotent (provider retries): key on the provider event
  id.

## Why it matters

- Monetisation cannot exist without it; every other subscription feature
  (plan cards, history, cancel) is already built and waiting.
- The hosted model needs no card UI, no PCI audit, and roughly one entity
  (`Payment`) plus one adapter interface — small enough for one branch.

## Implementation notes

- New `payment` module: `Payment` entity (user FK LAZY, plan FK LAZY,
  provider session/event ids, amount, currency, status, `paidAt` as
  `OffsetDateTime` UTC), `PaymentProvider` interface with a fake in-memory
  implementation for tests/dev (MSW mirrors it client-side) and one real
  adapter behind configuration.
- Webhook endpoint is unauthenticated but signature-verified; never trust
  amounts from the client — price comes from the `Plan` row server-side.
- Tests: session creation 409 on already-subscribed, webhook idempotency,
  webhook activates exactly the session's plan/user, history ordering.

## Definition of done

A user upgrading picks a billing period, is redirected to a (fake in dev)
provider page, returns, and their Premium subscription is active with a
payment record in history; paid plans cannot be activated without the
webhook; documented in `docs/foundation/api.md`; quality gates pass.
