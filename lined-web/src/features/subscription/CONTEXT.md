# CONTEXT.md — `src/features/subscription/`

## Purpose

Billing plans and the current user's subscription (active plan + history).
Self-contained — nothing else in the app depends on subscription data yet.

## Structure

```
subscription/
  PlanCards.tsx                available plans, pick-a-plan UI
  CurrentPlanCard.tsx           active subscription summary + cancel action
  SubscriptionHistoryCard.tsx   past subscriptions table
  model/index.ts                 PlanDto, SubscriptionDto, SubscriptionCreateDto
  api/                           prod.ts + dev.ts + index.ts + mockData.ts + handlers.ts
                                 — covers BOTH /plans and /subscriptions endpoints
  lib/
    subscriptionUtils.ts          formatShortDate, formatPlanPrice
    constants.ts                  QUERY_KEYS only
  hooks/useSubscriptions.ts        usePlans, useActivePlan, useSubscriptionHistory,
                                 useStartSubscription, useCancelSubscription
  pages/SubscriptionPage.tsx
```

## API surface

`prod.ts`: `GET plans`, `GET plans/{id}`, `GET subscriptions/{userId}/active`,
`GET subscriptions/{userId}/history`, `POST subscriptions`,
`POST subscriptions/{userId}/cancel-active`.

`useActivePlan` treats a 404 from `subscriptions/{userId}/active` as "no
active subscription" (`null`), not an error — checked via
`getErrorStatus(error)` from the shared `src/lib/apiClient.ts`, which
recognizes both a real `ky` `HTTPError` and `dev.ts`'s `MockHttpError`.

## Depends on

- `features/settings/SettingsCard` — shared card shell (see
  `features/settings/CONTEXT.md`)
- `features/users/hooks/useCurrentUser` — `SubscriptionPage`

## Depended on by

Nothing yet — no other feature reads subscription data.

## Testing

Colocated `__tests__/` per component/hook/lib file. `useSubscriptions.test.tsx`
covers the 404-as-null behavior for `useActivePlan` explicitly — keep that
test if the error-status handling ever changes. See root `docs/TESTING.md`.

## Known gaps

- No proration or plan-upgrade flow — `useStartSubscription` only supports
  starting a fresh subscription when there's no active one (the API 409s
  otherwise).
