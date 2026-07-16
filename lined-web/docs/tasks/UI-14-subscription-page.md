# Task 14 — Subscription & Plan Page

**Branch:** `feature/ui-14-subscription-page`

*Depends on Task 12 (linked from User Settings). Priority: lowest (P3) — not
part of the mockup MVP flows.*

> Merged from the earlier single-file plan (PR #63, task "Subscription & Plan
> Page") into this task-file format.

## Detailed description

New page at `/subscription` showing the user's subscription status and the
available plans:

- **Current plan section** — active plan name, price, renewal/expiry date,
  "Cancel" button (with confirmation). If there is no active subscription,
  show a "You are on the free plan" message instead.
- **Available plans section** — one card per plan (name, price, duration);
  the card matching the current plan is highlighted; each other card has a
  "Subscribe" button.
- **Subscription history** — accordion/list of past subscriptions.
- Entry point: a "Subscription" row/link in User Settings (Task 12) and/or
  the settings left menu.

## Idea of this task

Expose the already-built backend billing domain (plans + subscriptions) in
the UI so plan management is self-service. The API layer
(`src/api/plans.ts`, `src/api/subscriptions.ts`) and types (`PlanDto`,
`SubscriptionDto`) already exist — this task is purely page + hooks.

## Reference to mockup

- The page now has a dedicated screen: id **`subscription`**
  (`http://localhost:4321/#subscription`) — Current Plan card with cancel
  button, three plan cards (current one highlighted with a CURRENT badge),
  and a Subscription History card with ACTIVE/ENDED badges.

## Development steps

1. Create `src/hooks/useSubscriptions.ts`: `usePlans()`, `useActivePlan()`
   (`GET /api/subscriptions/{userId}/active` — treat 404/empty as "free
   plan"), `useSubscriptionHistory()`, `useStartSubscription()` and
   `useCancelSubscription()` mutations with query invalidation. Add the new
   query keys to `QUERY_KEYS` in `src/lib/constants.ts`.
2. Create `src/pages/SubscriptionPage.tsx` with the three sections above;
   add the `/subscription` route inside `AppShell` in `src/router.tsx`.
3. Subscribe flow: clicking "Subscribe" on a plan card posts
   `{ userId, planId }`; handle the 409 conflict when an active subscription
   already exists (prompt to cancel first).
4. Cancel flow: confirmation dialog → `POST
   /api/subscriptions/{userId}/cancel-active`; refresh active + history.
5. Link from User Settings (Task 12) to `/subscription`.
6. Tests (MSW): free-plan state, active-plan rendering, subscribe posts the
   right payload, cancel requires confirmation, history renders.

## Final / expected result

- `/subscription` shows current plan (or free-plan message), available plan
  cards with the active one highlighted, working subscribe/cancel with
  confirmations, and subscription history.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| List plans | `GET /api/plans` → `PlanDto[] { id, name, priceUsd, durationDays, createdAt }` |
| Active subscription | `GET /api/subscriptions/{userId}/active` → `SubscriptionDto` |
| History | `GET /api/subscriptions/{userId}/history` → `SubscriptionDto[]` |
| Subscribe | `POST /api/subscriptions` — body `{ userId, planId, startDate?, endDate?, active? }` → `201 SubscriptionDto` |
| Cancel | `POST /api/subscriptions/{userId}/cancel-active` → `SubscriptionDto` |

**Backend gap:** no payment processing — subscribing simply activates a plan;
no proration or renewal logic is exposed. Fine for MVP.
