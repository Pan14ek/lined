# Task BE-08 — Sandbox Stub Provider Adapter

**Branch:** `feature/be-08-sandbox-stub-provider-adapter`

*Depends on BE-07 (ports). Enables local + CI development of every
subsequent task without a real provider account.*

## Detailed description

Ship an in-memory, deterministic sandbox adapter that satisfies every
port from BE-07. It advertises every MVP-mandatory capability from §19.4
so the capability validator passes. It stores state in a
`ConcurrentHashMap` (no persistence) and produces synthetic events that
the webhook processor (BE-09) can ingest via a helper endpoint used
only in dev/test profiles.

Scope:

1. Package `io.backend.lined.billing.infrastructure.provider.sandbox`
   with `SandboxProviderAdapter` implementing all six port interfaces
   and qualified as `sandbox`.
2. Deterministic behavior:
   - `createCustomer` returns `provider_customer_id = "cus_" +
     billingAccountId.hex`
   - `createCheckout` returns a canonical `CheckoutSession` with
     `providerCheckoutId = "co_" + UUID` and a fake `overlayData`
     payload
   - `getSubscription`/`snapshot` reads from the internal map
   - `scheduleCancellation`/`resumeSubscription`/`schedulePriceChange`
     update the internal map and emit synthetic events
   - `issueRefund` moves refund to `SUCCEEDED` immediately and emits
     a refund event
   - `previewRefund` returns the full remaining refundable amount
3. Capability advertisement: every MVP-mandatory cap `true`; preferred
   caps `true` where reasonable (overlay checkout, localized pricing,
   cancel-at-period-end, resume, full/partial refunds, sandbox mode,
   customer portal). `automaticTax=false`, `merchantOfRecord=false`.
4. Dev/test-only helper: `SandboxWebhookSimulator` — a
   `@Profile("dev|test")` component with methods like
   `simulatePaymentConfirmed(subscriptionId)` invoked from an
   integration test to drive BE-09's webhook processor. Not exposed via
   HTTP.
5. Localized pricing: `getPricingPreview(countryCode='UA')` returns the
   Ukrainian preview from design §20.2 verbatim; other country codes
   return USD values. Values are hard-coded in the adapter — nothing
   real is happening.
6. Provider selection matrix (design §19.5) — reproduced as a table in
   the task file itself + committed as
   `backend/lined/docs/billing/PROVIDER_SELECTION_MATRIX.md` with the
   "TBD" cells so the eventual provider decision has a home.

## Design references

- §19 Provider Abstraction
- §19.4 Required MVP capabilities
- §19.5 Provider selection matrix
- §20 Localized Pricing
- §52 Phase 2 Sandbox provider adapter
- §56 Open decision #1

## Idea of this task

Every task from BE-09 onward needs a working provider to test against.
A deterministic in-memory sandbox lets BE-09..BE-15 be built,
integration-tested, and even manually poked in the dev environment
without provider credentials, sandbox accounts, or webhook forwarding
tools. The eventual real adapter re-implements the same ports and
passes the same contract tests.

## Development steps

1. Create the sandbox package.
2. Implement `SandboxProviderAdapter` — one class per port interface,
   or one composite class implementing all six (composite is simpler
   for shared state).
3. Wire `billing.provider=sandbox` as the default in
   `application.properties` and add a comment explaining that production
   overrides this via env var.
4. Add `SandboxWebhookSimulator` (profile-gated).
5. Add the pricing preview table (Ukrainian localized) and the USD
   fallback.
6. Write the provider selection matrix file
   (`PROVIDER_SELECTION_MATRIX.md`) with the design §19.5 columns
   populated with `TBD` for Paddle / Stripe / Mono and `sandbox` for
   the current in-tree adapter.
7. Contract test suite (`SandboxProviderContractTest`) that BE-07's
   architecture rule requires every future adapter to also pass —
   organized as a `@Nested` test class per port so a new adapter can
   `extends BillingProviderContractSuite` and provide its own bean.
8. Tests.
9. Run `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- Application starts with `billing.provider=sandbox`; capability
  validator passes.
- Every port method returns a canonical DTO with deterministic values.
- `SandboxWebhookSimulator` lets an integration test in BE-09/BE-11
  drive an ACTIVE subscription end-to-end without external services.
- Provider selection matrix committed with the design's cells filled
  from the sandbox and the rest `TBD`.
- `./gradlew test`, `./gradlew checkstyleMain`, `./gradlew spotbugsMain`
  pass.

## REST API added / changed

None. `SandboxWebhookSimulator` is a Java component, not an HTTP
endpoint.

## Tests to add

- **Contract — `SandboxProviderContractTest`** (extends the shared
  `BillingProviderContractSuite`): create pricing preview, create
  checkout, subscription state map (ACTIVE/PAST_DUE/CANCELED),
  schedule cancellation returns snapshot with `cancelAtPeriodEnd=true`,
  resume clears it, schedule price change fills the scheduled fields,
  refund preview + issue return canonical results.
- **Unit — `SandboxProviderCapabilitiesTest`**: every MVP-mandatory
  capability from §19.4 is `true`; the capability validator returns
  no errors.
- **Unit — `SandboxWebhookSimulatorTest`**: publishing a synthetic
  payment-confirmed event enqueues the expected canonical event object
  for BE-09's processor.

## Risk & follow-ups

- State is in-memory only. Restarting the app drops sandbox
  subscriptions; that is intended for local/CI and would be a bug in
  production — the config guards against `sandbox` being the selected
  provider in `prod` profile with a startup assertion.
- The synthetic webhook path skips signature verification; BE-09's
  test that "invalid signature is rejected" must not use the sandbox
  helper — it must fabricate a raw request against the real webhook
  endpoint.
