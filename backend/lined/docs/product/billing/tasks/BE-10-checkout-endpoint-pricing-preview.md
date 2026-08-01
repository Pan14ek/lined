# Task BE-10 — Checkout Endpoint + Pricing Preview

**Branch:** `feature/be-10-checkout-endpoint-pricing-preview`

*Depends on BE-05 (PriceCode), BE-06 (subscription/customer tables),
BE-07 (ports), BE-08 (sandbox). Blocks BE-11 (activation) and UI-39 +
UI-40.*

## Detailed description

Ship the two endpoints that let the frontend open a provider-controlled
checkout: pricing preview and checkout creation. Never accept
amount/currency/`providerPriceId` from the client; look everything up
server-side from BE-05's catalog. Lazily create a `ProviderCustomer`
during the first checkout for a BillingAccount, safe under concurrent
requests.

Scope:

1. New table `billing_checkout_attempts` per design §12.6:
   `id`, `billing_account_id`, `price_code`, `provider`,
   `provider_checkout_id` (nullable), `status`
   (`CREATED|COMPLETED|EXPIRED|FAILED`), `idempotency_key` (unique
   with `(billing_account_id, 'CHECKOUT')`), `expires_at`, timestamps.
2. `POST /api/billing/checkout`:
   - requires header `Idempotency-Key` (`428 PRECONDITION_REQUIRED` if
     missing)
   - body: `{ "priceCode": "PRO_MONTHLY" | "PRO_YEARLY" }` — nothing
     else accepted
   - looks up `PriceCode` via `PricingCatalogService`
     (`404 PRICE_NOT_AVAILABLE` if not active)
   - resolves BillingAccount from `X-User-Id`
   - ensures a `ProviderCustomer` exists; if not, creates one via
     `BillingCheckoutProvider.createCustomer(...)`, then persists the
     mapping with `INSERT ... ON CONFLICT DO NOTHING` (safe under
     concurrent first checkouts — see §42.2)
   - calls `BillingCheckoutProvider.createCheckout(...)` with the
     canonical `CreateCheckoutCommand` (billingAccountId, priceCode
     resolved to `providerPriceId`, `providerCustomerId`, idempotency
     key)
   - persists a `billing_checkout_attempts` row and returns
     `{ providerCheckoutId, overlayData, expiresAt, checkoutAttemptId }`
   - repeated calls with the same `Idempotency-Key` return the same
     row's data (idempotent)
3. `GET /api/billing/prices`:
   - reads active prices for `PRO` from catalog
   - calls `BillingPricingProvider.getPricingPreview(...)` (country
     detected from `Accept-Language` / geo IP header if available; else
     default)
   - returns the shape from design §20.2
   - cached in-memory for 5 minutes keyed on
     `(provider, priceCodes, country)`; cache miss populates
   - never used as a financial source of truth — a warning banner in
     the DTO description makes this explicit for downstream

## Design references

- §12.6 `billing_checkout_attempts`
- §20 Localized Pricing
- §21 Checkout Flow
- §37.2 Pricing preview
- §37.3 Create checkout
- §41.2 Price integrity
- §42.1 Checkout idempotency
- §42.2 Provider customer creation

## Idea of this task

The two endpoints together are the "before payment" contract:
frontend shows a price, frontend asks backend for a checkout session,
backend hands back overlay data. Everything about the price and the
session — amount, currency, provider price id, provider customer — is
decided server-side. This is the boundary that keeps a hostile
frontend from paying `$0.01` for Pro.

## Development steps

1. Append `billing_checkout_attempts` DDL to `schema.sql`.
2. Add entity + repository under `billing/domain/checkout/`.
3. Add `BillingController` methods for `POST /api/billing/checkout` and
   `GET /api/billing/prices` (or split into `BillingCheckoutController`
   / `BillingPriceController` — pick per project convention).
4. `CheckoutService.startCheckout(userId, priceCode, idempotencyKey)`:
   - look up BillingAccount
   - look up + activate `PriceCode` mapping
   - `ensureProviderCustomer(billingAccountId)` with the ON CONFLICT
     safeguard
   - `checkoutProvider.createCheckout(...)`
   - persist attempt (unique on `idempotency_key` scoped to
     `billing_account_id`)
   - return DTO
5. `PricingPreviewService.getPreview(planCode, requestContext)` +
   Caffeine cache with 5 min TTL.
6. Configure raw exception mapping for `PRICE_NOT_AVAILABLE`,
   `CHECKOUT_ALREADY_IN_PROGRESS`, `PROVIDER_TEMPORARILY_UNAVAILABLE`
   (map provider port timeouts to the last one).
7. Tests.
8. Run `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- `GET /api/billing/prices` returns the sandbox-preview payload; UI-39
  can render against it.
- `POST /api/billing/checkout` (with `Idempotency-Key`) returns overlay
  data on happy path; repeated calls return the same overlay data.
- Provider customer is created lazily and only once per (account,
  provider) — enforced by the unique index and the ON CONFLICT retry.
- Missing/inactive `PriceCode` returns `404 PRICE_NOT_AVAILABLE`.
- Missing `Idempotency-Key` returns `428`.
- `./gradlew test`, `./gradlew checkstyleMain`, `./gradlew spotbugsMain`
  pass.

## REST API added / changed

| Purpose | Method + Path |
|---|---|
| Pricing preview | `GET /api/billing/prices` |
| Create checkout | `POST /api/billing/checkout` (body `{ priceCode }`, header `Idempotency-Key`) |

## Tests to add

- **Controller — `BillingCheckoutControllerTest`**:
  - 428 when `Idempotency-Key` missing
  - 400 on unknown `priceCode`
  - 404 `PRICE_NOT_AVAILABLE` on `active=false` price
  - 200 happy path against the sandbox; second call with same key
    returns identical body
  - client cannot pass `amount`, `currency`, `providerPriceId`,
    `userId` — extra body fields are ignored/400 (per Jackson config)
- **Controller — `BillingPricesControllerTest`**: returns the sandbox
  preview shape; second call in cache window returns from cache (spy
  on port).
- **Integration — `CheckoutConcurrentFirstCustomerIT`**: two threads
  submit first-checkout in parallel → exactly one
  `billing_provider_customers` row.
- **Integration — `CheckoutIdempotencyIT`**: two POSTs with same
  `Idempotency-Key` → one `billing_checkout_attempts` row.

## Risk & follow-ups

- The pricing preview cache is per-instance. In a multi-instance
  deploy, users on different pods may see a stale preview until TTL
  expires — acceptable at 5 min; BE-15 can add a manual invalidation
  endpoint.
- No `PENDING` subscription row is created here — design §14 leaves it
  optional. BE-11 creates the row on webhook confirmation instead;
  frontend polls `GET /api/billing/me` after overlay close.
