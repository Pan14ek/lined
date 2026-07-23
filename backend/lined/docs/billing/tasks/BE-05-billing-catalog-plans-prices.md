# Task BE-05 — Billing Catalog (Plans + Prices)

**Branch:** `feature/be-05-billing-catalog-plans-prices`

*Depends on BE-04 (legacy endpoints removed). Precedes BE-06
(subscription references `price_code`) and BE-10 (checkout resolves
`PriceCode` → `providerPriceId` server-side).*

## Detailed description

Introduce the target catalog schema and enforce a server-side
`PriceCode` → `providerPriceId` mapping so the frontend can never
influence the amount, currency, or provider price identifier.

Scope:

1. New tables:
   - `billing_plans` (`code` PK, `display_name`, `active`,
     `created_at`, `updated_at`) — seed rows `FREE`, `PRO`
   - `billing_prices` (`code` PK, `plan_code` FK,
     `billing_interval` enum `MONTH|YEAR`, `provider`, `provider_price_id`,
     `active`, `created_at`, `updated_at`) — seed rows `PRO_MONTHLY`,
     `PRO_YEARLY` with `provider='sandbox'` and stub
     `provider_price_id` values so BE-08 can hand them out
2. Enums under `billing/domain/plan/`: `PlanCode` (already added in
   BE-01), `BillingInterval`, `PriceCode`.
3. Entities + repositories: `PlanCatalogEntity`, `PriceCatalogEntity`,
   `PlanCatalogRepository`, `PriceCatalogRepository`.
4. `PricingCatalogService`:
   - `getActivePrices(PlanCode)` — returns active `PriceCatalogEntity`
     rows for that plan
   - `requireProviderPriceId(PriceCode)` — throws
     `ConflictException("PRICE_NOT_AVAILABLE")` if `active=false` or
     missing
5. Delete the old `PlanController` and `PlanServiceImpl` completely;
   remove the `plans` table from `schema.sql` (add a `DROP TABLE IF
   EXISTS plans` in the migration section — old table was already
   effectively dead after BE-04).
6. Remove `plan/` module.
7. No public endpoint added here — pricing preview lives in BE-10.

## Design references

- §12.3 `billing_plans`
- §12.4 `billing_prices`
- §41.2 Price integrity
- §48.2 Phase 5 Remove legacy data

## Idea of this task

The frontend must never send an amount, currency, or provider price
identifier. Keeping the catalog server-side with a small, admin-managed
allowlist means checkout requests take only a stable internal `PriceCode`
that maps to something the provider recognizes. Deleting the old
mutable `plans` table + `PlanController` in the same PR ensures no path
back to the prototype.

## Development steps

1. Append DDL for `billing_plans` and `billing_prices` +
   `INSERT ... ON CONFLICT DO NOTHING` seed rows to `schema.sql`.
2. Append `DROP TABLE IF EXISTS plans` to `schema.sql` after the new
   tables are created and seeded.
3. Add the enums under `billing/domain/plan/`.
4. Add entities + repositories.
5. Add `PricingCatalogService` with the two methods above.
6. Delete the `plan/` module (`PlanEntity`, `PlanRepository`,
   `PlanController`, `PlanServiceImpl`, `PlanMapper`, DTOs). Update
   `AccountProvisioningPolicy` / `AccountProvisioningSpec` to stop
   referencing plan names — BE-01 already made BillingAccount
   creation independent of plan lookup, but the properties block may
   still name a plan; drop that.
7. Tests.
8. Run `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- `billing_plans` seeded with `FREE`, `PRO` rows; `billing_prices`
  seeded with `PRO_MONTHLY`, `PRO_YEARLY`.
- Old `plans` table dropped; `plan/` module absent from the source tree.
- `PricingCatalogService.requireProviderPriceId(PRO_MONTHLY)` returns
  the seeded stub id; setting a row to `active=false` makes it throw
  `PRICE_NOT_AVAILABLE`.
- No public REST change (UI still reads no prices — BE-10 will add
  `GET /api/billing/prices`).
- `./gradlew test`, `./gradlew checkstyleMain`, `./gradlew spotbugsMain`
  pass.

## REST API added / changed

None in this task. `POST/PUT/DELETE /api/plans` and `GET /api/plans`
were already removed in BE-04; the tables backing them are dropped
here.

## Tests to add

- **Integration — `BillingCatalogSchemaIT`** (Testcontainers): seed
  rows exist; `plans` table absent; unique constraints on `code`
  columns.
- **Unit — `PricingCatalogServiceTest`**:
  `requireProviderPriceId(PRO_YEARLY)` returns the sandbox id; when
  `active=false` throws `ConflictException("PRICE_NOT_AVAILABLE")`;
  when the row is missing throws `NotFoundException`.
- **Unit — `PricingCatalogServiceInactivePlanTest`**: requesting a
  price whose parent plan is `active=false` throws
  `PRICE_NOT_AVAILABLE`.

## Risk & follow-ups

- Sandbox `provider_price_id` values are placeholders. When the real
  provider is chosen, update the seed via an `UPDATE ... WHERE
  provider='sandbox'` migration or via a new admin endpoint added in
  BE-14.
- Old `PlanDto` was consumed by UI-14 (`GET /api/plans`). UI-38 in the
  same release cycle stops calling it; verify no test still hits the
  old endpoint before dropping the endpoint definition.
