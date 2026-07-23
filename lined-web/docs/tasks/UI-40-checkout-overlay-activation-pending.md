# Task 40 — Checkout Overlay + Payment Confirmation Pending

**Branch:** `feature/ui-40-checkout-overlay-activation-pending`

*Depends on Task 38 (billing scaffold) and Task 39 (pricing card).
Backend BE-10 (`POST /api/billing/checkout`) + BE-11 (webhook
activation writes `subscription.status=ACTIVE`). Supersedes Task 26.*

## Detailed description

Wire the "Upgrade to Pro" button to a provider-controlled overlay
checkout. Never activate PRO from any client-side signal — always poll
`GET /api/billing/me` until the backend reports `status=ACTIVE`.

- **Click → provider overlay** — the button calls
  `POST /api/billing/checkout` with the selected `priceCode` from
  UI-39's store and a fresh `Idempotency-Key` (`crypto.randomUUID()`
  stored in `sessionStorage` per (billingAccountId, priceCode) so a
  reload re-uses the same key). The response's `overlayData` is passed
  to the provider script (sandbox handler mimics this with a fake
  redirect + timed webhook simulation).
- **UI state machine** (design §49.2): `IDLE → LOADING_PRICES →
  CREATING_CHECKOUT → CHECKOUT_OPEN → PAYMENT_CONFIRMATION_PENDING →
  ACTIVE | ERROR`. Modeled as a small XState-lite reducer or Zustand
  slice — do not spread booleans across components.
- **Pending state** — after overlay closes (or the provider frontend
  event fires — treat as a *hint*, not a confirmation), poll
  `GET /api/billing/me` every 1.5s up to 30s. When
  `subscription?.status==='ACTIVE'` and
  `effectivePlan==='PRO'`, transition to ACTIVE, close the modal,
  toast "You're on Pro". Otherwise show a non-error "Payment received
  — activation pending. This can take a moment." with a manual refresh
  button.
- **Errors** — 429 → toast "Too many attempts, try again in a moment";
  409 `CHECKOUT_ALREADY_IN_PROGRESS` → toast + re-poll `me`;
  `PROVIDER_TEMPORARILY_UNAVAILABLE` → toast + retry button;
  network error → inline retry.
- **Guards** — button hidden when `effectivePlan==='PRO'` or
  `rollout.checkoutEnabled===false`.

## Idea of this task

Trust in the checkout flow is set by what happens between "click pay"
and "see Pro". The design forbids activation from any client signal
because provider frontend callbacks can lie or be replayed. Polling
the server, on the other hand, is deterministic and matches production
reconciliation exactly.

## Reference to mockup

- Existing `checkout` screen — the modal-overlay treatment there is
  the visual reference. The provider iframe is opaque; this task's
  focus is the *pending* state after overlay close: the same modal
  card shrinks to a small spinner + "Activating your Pro plan…"
  message, replacing the summary.

## Development steps

1. **MSW first.** Extend `src/features/billing/api/`:
   - `handlers.ts` — POST `/api/billing/checkout` returns a canonical
     `CheckoutSession` mock (`providerCheckoutId='co_test'`,
     `overlayData={ testMode: true }`). Add a helper
     `simulatePaymentConfirmed(delayMs=800)` that after the delay
     mutates the mock `billingMe` variant to `PRO_ACTIVE` so the
     polling loop transitions.
   - `dev.ts` + `prod.ts` — add `createCheckoutSession(priceCode,
     idempotencyKey)`; extend `index.ts`.
2. **Types.** `CheckoutSessionDto`, `CreateCheckoutRequest`,
   `CheckoutErrorCode` union.
3. **State machine.** `src/features/billing/checkout/checkoutMachine.ts`
   — Zustand slice or reducer implementing the state machine above.
4. **Hooks.**
   - `useCreateCheckout()` mutation — inputs `priceCode`; generates +
     persists `Idempotency-Key`.
   - `useBillingMePolling(active: boolean)` — wraps `useBillingMe`
     with `refetchInterval: 1500` while `active`; stops on ACTIVE or
     after 30s.
5. **Components.**
   - `CheckoutModal.tsx` — dialog hosting overlay iframe + pending
     state.
   - `PricingCard.tsx` — enable the CTA in this task; on click, open
     `CheckoutModal`.
6. **Integration.** `BillingPage` renders `<CheckoutModal />` behind a
   Zustand flag.
7. **Tests.**
   - `checkoutMachine.test.ts` — every transition; illegal transitions
     ignored.
   - `CheckoutModal.test.tsx` — happy path (open → provider →
     simulated webhook → ACTIVE toast); pending timeout renders
     manual refresh; 409 renders toast + reset; sessionStorage key
     persists on reload.
   - `PricingCard.test.tsx` — CTA disabled when rollout off; enabled
     otherwise.

## Final / expected result

- Clicking "Upgrade to Pro" opens the checkout modal, calls the
  backend, opens the provider overlay, and after simulated payment
  confirmation the page reflects PRO. No client-side activation short
  cut.
- The `Idempotency-Key` is stable across reloads within a session.
- Polling stops within 30s regardless of outcome; the user sees
  either PRO or the pending-with-refresh state.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Create checkout | `POST /api/billing/checkout` (body `{ priceCode }`, header `Idempotency-Key`) → `{ providerCheckoutId, overlayData, expiresAt, checkoutAttemptId }` |
| Poll activation | `GET /api/billing/me` |

**Backend gap:** BE-10 + BE-11 provide these. If BE-11 isn't yet
shipped when this task starts, the sandbox MSW simulator lets UI work
proceed against a mocked activation.
