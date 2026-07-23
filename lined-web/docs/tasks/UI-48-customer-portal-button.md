# Task 48 — Customer Portal Button

**Branch:** `feature/ui-48-customer-portal-button`

*Depends on Task 38 (scaffold). Backend needs a `POST
/api/billing/portal` endpoint — the design references it (§37.7); if
BE-11 doesn't include it, coordinate as a small addendum to BE-11 or
BE-15.*

## Detailed description

Add a "Manage billing" button that opens the provider's customer
portal so users can update card, view invoices, etc. — anything Lined
doesn't own the UI for.

- **Button** — visible whenever a `ProviderCustomer` exists for the
  account (server flag exposed on `GET /api/billing/me` as
  `hasProviderCustomer` or inferred from `subscription != null`).
- **Click** — `POST /api/billing/portal` returns
  `{ portalUrl, expiresAt }`. Open in a **new tab** (`window.open(url,
  '_blank', 'noopener,noreferrer')`). Do not iframe — provider CSP
  usually blocks it, and the short-lived URL should be visible in the
  address bar for trust.
- **Loading + error** — button spinner while the mutation is in
  flight; on failure toast "Couldn't open the payment portal —
  try again in a moment" and log correlation id.
- **Reuse** — Task 43's "Update payment method" CTA calls the same
  hook.

## Idea of this task

Customer portals are the standard place for card updates, invoices,
and cancellation confirmation — attempting to re-implement each screen
in Lined would triple this project's scope and remain worse than the
provider's version. One button, one server call, done.

## Reference to mockup

- No mockup — the button lives on the current-plan card in
  `/subscription` next to Cancel/Resume, and inside Task 43's
  payment-issue banner.

## Development steps

1. **MSW first.** Extend `src/features/billing/api/handlers.ts`:
   - POST `/api/billing/portal` returns
     `{ portalUrl: 'https://sandbox.example/portal/xyz', expiresAt: ISO }`
   - `dev.ts` + `prod.ts`: `openCustomerPortal()`
2. **Hook.** `useOpenCustomerPortal()` — mutation returning the URL;
   consumers call `window.open` themselves so tests can spy.
3. **Component.** `ManageBillingButton.tsx` — pill button; loading
   spinner; consumes the hook.
4. **Integration.**
   - Add to `SubscriptionManageCard` (from UI-41).
   - Task 43's `PaymentIssueBanner` uses this same button internally.
5. **Tests.**
   - `useOpenCustomerPortal.test.tsx` — success returns URL; 500 sets
     error; loading state exposed.
   - `ManageBillingButton.test.tsx` — click triggers mutation; on
     success calls `window.open` with the URL and correct flags.

## Final / expected result

- "Manage billing" button appears when there's a provider customer;
  click opens the portal in a new tab.
- Same button used from `/subscription` and the payment-issue banner.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Open customer portal | `POST /api/billing/portal` → `{ portalUrl, expiresAt }` |

**Backend gap:** if BE-11/BE-15 don't include this endpoint, add a
one-hour PR to BE-11 that wires
`BillingPortalProvider.createCustomerPortal(...)` from BE-07's port.
