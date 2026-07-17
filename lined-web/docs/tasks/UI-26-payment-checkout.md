# Task 26 — Payment & Checkout Flow

**Branch:** `feature/ui-26-payment-checkout`

*Depends on Task 14 (subscription page). Mock-first: the backend payment
API is proposed, not implemented — see the gap note below.*

## Detailed description

The subscription page can "Subscribe" to Premium for free because no
payment exists. The standard, user-trusted flow is **provider-hosted
checkout** (Stripe Checkout model; LiqPay/Fondy equivalent for the
Ukrainian market): Lined never renders card fields, never touches card
data — the user pays on the provider's page and comes back.

1. **Checkout modal** — "Subscribe"/"Upgrade" on a paid plan card opens a
   modal: billing-period picker (Monthly / Yearly with discount badge),
   order summary (price, renewal date, "Due today"), a reassurance note
   ("you'll pay on our provider's secure page; we never see your card"),
   and one primary action: **"Continue to secure payment →"**.
2. **Redirect out** — the button calls
   `POST /api/payments/checkout-sessions` and navigates to the returned
   `checkoutUrl` (in dev/MSW: a fake provider route that immediately
   redirects back).
3. **Return states** — `/subscription?checkout=success` polls
   `GET /api/payments/checkout-sessions/{id}` until `COMPLETED` (pending
   spinner card → success banner "You're on Premium 🎉" and the plan cards
   re-render as active); `?checkout=cancelled` shows a neutral "Payment
   cancelled — you haven't been charged" banner. Session id kept in
   sessionStorage across the redirect.
4. **Payment history** — a "Payments" card on the subscription page
   (`GET /api/payments/history`): date, plan, period, amount, status
   badge, "Receipt ↗" link to the provider receipt. Renders only when
   non-empty.
5. **Guards** — already-Premium users see "Manage" instead of "Subscribe";
   a 409 from session creation shows the existing inline-conflict pattern.

## Idea of this task

Payments are where user trust is won or lost — a short, standard,
no-surprises flow (summary → provider page → confirmation) is both the
simplest to build and the most credible to users. Keeping card entry off
Lined entirely is the industry-standard way to be "simple and clear".

## Reference to mockup

- New screen id **`checkout`** (`http://localhost:4321/#checkout`):
  "Upgrade to Premium" modal over the dimmed subscription page —
  Monthly/Yearly picker (Yearly shows "−17%"), order summary with "Due
  today", the 🔒 reassurance note, full-width "Continue to secure
  payment →", and the "Cancel anytime / VISA · Mastercard · Apple Pay ·
  Google Pay" footer.

## Development steps

1. MSW first: handlers for checkout-session create/poll (a fake provider
   page can be simulated by resolving the session to `COMPLETED` after a
   short delay) and payments history, per the proposal's DTOs.
2. `useCheckout.ts` hooks: `useCreateCheckoutSession`,
   `useCheckoutSession(id)` (poll with `refetchInterval` until terminal),
   `usePaymentHistory`.
3. `CheckoutModal` (`src/components/subscription/CheckoutModal.tsx`) +
   period picker; wire from `PlanCards` (replacing the direct
   `useStartSubscription` call for paid plans — keep it for the free
   plan/dev path).
4. Return-state handling in `SubscriptionPage` (query-param driven, same
   pattern as `/sign-in?reset=success`); `PaymentsHistoryCard`.
5. Tests (MSW): modal shows correct summary per period; "Continue"
   navigates to the session URL; success return polls to COMPLETED and
   shows the active plan; cancelled return shows the neutral banner and no
   subscription change; 409 renders inline; history renders rows with
   receipt links.

## Final / expected result

- Upgrading is a three-step story — review, pay on the provider page,
  land back on an active Premium — with payment history and receipts on
  the subscription page, all exercised against MSW.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Create session | `POST /api/payments/checkout-sessions` |
| Poll result | `GET /api/payments/checkout-sessions/{sessionId}` |
| History | `GET /api/payments/history` |
| Cancel plan | `POST /api/subscriptions/{userId}/cancel-active` (existing) |

**Backend gap:** the whole payment surface is proposed in
`backend/lined/docs/api-proposals/payment-checkout-api.md`
(`feature/payment-checkout-api`); until it ships this flow is MSW-only,
like Task 18 was.
