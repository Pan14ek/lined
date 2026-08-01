# Task BE-07 — Provider Port Abstraction

**Branch:** `feature/be-07-provider-port-abstraction`

*Depends on BE-05 (PriceCode) and BE-06 (canonical subscription model).
Blocks BE-08 (sandbox adapter implements every port) and every task
that calls a port (BE-09..BE-13).*

## Detailed description

Define provider-agnostic ports and canonical DTOs so the domain never
imports Paddle/Stripe/Mono SDK types. Ship the `BillingProviderCapabilities`
record and a startup validator that fails fast if the selected adapter
does not advertise the MVP-mandatory capabilities.

Scope:

1. New package `io.backend.lined.billing.port` containing the six
   interfaces from design §19.2:
   - `BillingPricingProvider`
   - `BillingCheckoutProvider`
   - `BillingSubscriptionProvider`
   - `BillingRefundProvider`
   - `BillingPortalProvider`
   - `BillingReconciliationProvider`
2. Canonical DTOs under `billing/port/model/` (records only, no
   provider-specific fields):
   - `ProviderCustomer(providerCustomerId)`
   - `ProviderPriceId(String value)` value object
   - `ProviderSubscriptionId(String value)` value object
   - `ProviderSubscription(...)` — normalized snapshot with the fields
     needed by BE-06 (status, current period, cancel_at_period_end,
     scheduled_price_code/at, past_due_since, grace_ends_at,
     provider_updated_at)
   - `ProviderSubscriptionSnapshot` — reconciliation subset
   - `CheckoutSession(providerCheckoutId, overlayData, expiresAt)`
   - `CreateCheckoutCommand(billingAccountId, priceCode, providerCustomerId,
     idempotencyKey, returnUrl?)`
   - `PricingPreview(planCode, countryCode, prices[])`, `PricingPrice(...)`
   - `PricingPreviewRequest(planCode, countryCode?, currency?)`
   - `RefundPreview`, `RefundPreviewRequest`, `RefundCommand`,
     `ProviderRefundResult`
   - `CustomerPortalSession`
   - `ProviderOperationResult(status, snapshot, warnings[])`
3. `BillingProviderCapabilities` record with the fields in §19.3.
4. `BillingProviderCapabilityValidator` — a
   `ApplicationRunner`/`@PostConstruct` that reads the injected
   adapter's `getCapabilities()` and throws on startup if any
   MVP-mandatory capability from §19.4 is false. Log a warning for
   missing "preferred" capabilities.
5. `billing.provider` Spring property + a `BillingProviderConfig` that
   picks the adapter bean by qualifier. Ship no adapter here — BE-08
   provides the sandbox adapter with qualifier `sandbox`. Startup fails
   with a clear message if the property is unset or names an unknown
   adapter.
6. ArchUnit test enforcing:
   - no class in `billing.domain..` or `billing.application..` imports
     from `billing.infrastructure.provider..`
   - no class in `billing.domain..` imports Paddle/Stripe/Mono SDK
     package prefixes
   - port interfaces live only in `billing.port..`

## Design references

- §9 Dependency Rules (rule 1, 2)
- §19 Provider Abstraction (all subsections)
- §19.4 Required MVP capabilities
- §54 Architecture Enforcement

## Idea of this task

Provider selection is deferred. Every downstream task calls the ports,
not a concrete adapter. Codifying the ports + capability contract now
means the day the real provider is chosen, one new adapter class + one
property change flips it on — with the capability validator catching
"we chose a provider that lacks partial refunds" at boot.

## Development steps

1. Create `billing.port` package + the six interfaces (methods per
   design §19.2 exactly).
2. Create `billing.port.model` package with the canonical DTOs. Use
   Java records everywhere; no null-checked SDK types.
3. Add `BillingProviderCapabilities` record.
4. Add `BillingProviderCapabilityValidator` with unit test.
5. Add `BillingProviderConfig` — `@ConfigurationProperties` for
   `billing.provider` (String) + Spring config that wires the chosen
   bean into every port interface via qualifier.
6. Add ArchUnit test class `BillingArchitectureTest` with the three
   rules above.
7. Tests.
8. Run `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- `billing.port` package exists with six interfaces and canonical DTOs.
- `BillingProviderCapabilityValidator` fails fast at startup when a
  mandatory capability is absent.
- Application does not start without a `billing.provider` setting and
  a matching adapter bean (BE-08 will provide the sandbox bean).
- ArchUnit test blocks any future PR that leaks provider DTOs into the
  domain layer.
- `./gradlew test`, `./gradlew checkstyleMain`, `./gradlew spotbugsMain`
  pass.

## REST API added / changed

None.

## Tests to add

- **Unit — `BillingProviderCapabilityValidatorTest`**: passes when all
  mandatory caps true; throws with a message naming the missing cap
  when any mandatory cap is false; only logs when a preferred cap is
  false.
- **Unit — `BillingProviderConfigTest`**: unknown provider name at
  startup → clear error message.
- **Architecture — `BillingArchitectureTest`** (ArchUnit): three rules
  pass on the current codebase; deliberately violating each rule in a
  scratch class breaks the corresponding test.

## Risk & follow-ups

- Startup will fail after this PR without BE-08's sandbox adapter.
  Land the two PRs together, or ship BE-07 behind a default provider
  property of `noop` and add a `NoopProviderAdapter` that throws
  `UnsupportedOperationException` from every port until BE-08 lands.
- The canonical DTOs are the public shape of the port surface — once
  an adapter is shipped, changing them requires updating every adapter.
