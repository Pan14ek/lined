# Task 39 — Pricing Preview + Monthly/Yearly Toggle

**Branch:** `feature/ui-39-pricing-preview-monthly-yearly`

*Depends on Task 38 (billing feature scaffold), backend BE-10
(`GET /api/billing/prices`). Precedes Task 40 (checkout uses the
selected price).*

## Detailed description

Add the pricing card so a FREE user can see localized monthly and
yearly Pro prices and pick one. The frontend never computes amounts or
currencies — it renders exactly what the server returns.

- **Pricing card** — visible when `effectivePlan=FREE`. Two pill
  segments: **Monthly** and **Yearly**. Selecting one previews the
  server-formatted amount + interval label. A subdued "Includes tax"
  or "Tax added at checkout" line comes from `taxIncluded` on the
  server DTO.
- **Feature bullets** — bullet list of PRO capabilities (10 lobbies,
  20 members, calendar integrations). Copy is static in this task; a
  future task can move it to `entitlements`.
- **CTA button** — "Upgrade to Pro" — disabled + tooltip "Checkout
  arrives with UI-40" in this task. UI-40 wires the click.
- **Loading + error** — skeleton on load (`Skeleton` from shadcn);
  inline error with retry button on failure.
- **Country hint** — the response's `countryCode` becomes a small
  footnote ("Prices shown for {country}"). Never editable client-side.

## Idea of this task

Localized pricing is the single most trust-critical piece of the
purchase flow — a wrong currency is a lost sale. Keeping the frontend
strictly display-only (fetch → render formatted string) protects
against every "amount in the URL" family of vulnerabilities; the
server-provided cache TTL means the preview stays reasonably fresh
without hammering the provider.

## Reference to mockup

- Existing `checkout` screen (`http://localhost:4321/#checkout`) —
  reuse its Monthly/Yearly pill picker and price row treatment; this
  task ships the *card* variant (in-page, not modal) — the modal comes
  in UI-40. The "Yearly saves N%" microcopy comes from comparing the
  yearly / monthly*12 client-side (display only).

## Development steps

1. **MSW first.** Extend `src/features/billing/api/`:
   - `mockData.ts` — add `MOCK_PRICING_PREVIEW_UA` (design §20.2
     Ukrainian sample) and `MOCK_PRICING_PREVIEW_US` (USD sample)
   - `handlers.ts` — GET `/api/billing/prices` returning UA by default;
     `setPricingVariant('US'|'UA')` helper for tests
   - `dev.ts` + `prod.ts` add `getPricingPreview()`; extend `index.ts`
     re-exports
2. **Types.** Extend `model/index.ts` with `PricingPreviewDto`,
   `PricingPriceDto` (fields: `priceCode`, `interval`, `amountMinor`,
   `currency`, `formattedAmount`, `taxIncluded`).
3. **Hook.** `src/features/billing/hooks/usePricingPreview.ts` —
   `useQuery` keyed on `QUERY_KEYS.pricing`. `staleTime` 5 minutes;
   only enabled when `effectivePlan=FREE`.
4. **UI store.** New Zustand slice `useBillingUiStore` in
   `src/features/billing/store/billingUi.ts` with
   `selectedInterval: 'MONTH' | 'YEAR'`; default `'MONTH'`.
5. **Components.**
   - `src/features/billing/PricingCard.tsx` — segment toggle + price
     row + bullets + disabled CTA. Purely presentational.
   - `src/features/billing/IntervalToggle.tsx` — small `Tabs`-based
     component; store the selection in the UI store.
6. **Page wiring.** Render `PricingCard` in `BillingPage` when
   `effectivePlan=FREE`.
7. **Tests.**
   - `PricingCard.test.tsx` — renders UA sample; toggling to yearly
     shows yearly amount; loading state renders skeleton; error state
     renders retry
   - `usePricingPreview.test.tsx` — disabled when PRO; 5-minute
     `staleTime` respected; 500 handled
   - Zustand slice test: default is `MONTH`; setter updates state

## Final / expected result

- FREE users see a Monthly/Yearly pricing card with server-formatted
  amounts; PRO users see no card.
- Toggling interval updates the displayed price without a new server
  call within the cache window.
- Loading → skeleton; error → retry.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Pricing preview | `GET /api/billing/prices` → `PricingPreviewDto { planCode, countryCode, prices[] }` |

**Backend gap:** none once BE-10 is shipped. In dev, the sandbox
adapter (BE-08) returns the UA sample.
