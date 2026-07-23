# Task 42 — Change Billing Interval (Monthly ↔ Yearly)

**Branch:** `feature/ui-42-change-interval-flow`

*Depends on Task 38 (scaffold), Task 39 (pricing card), Task 41
(cancel/resume — this task reuses the manage card). Backend BE-11
(`POST /api/billing/subscription/change-price`).*

## Detailed description

Let a PRO user switch between monthly and yearly. The change is
always scheduled for `currentPeriodEnd` — no proration, no immediate
charge, no mid-period surprise (design §26).

- **Change-interval button** — visible when `subscription.status==='ACTIVE'`
  and no `scheduledPriceCode` already set. Opens a small dialog:
  > "Switch to **{yearlyLabel}** on **{formattedCurrentPeriodEnd}**?
  > Your next charge will be {yearlyPreview.formattedAmount}."
  Confirm → `POST /api/billing/subscription/change-price` with the
  target `priceCode`. Success: invalidate `billingMe`; toast
  "Switching to yearly on {date}".
- **Scheduled change badge** — when `scheduledPriceCode !== null`, the
  current-plan card shows a chip: `→ Yearly on {date}` (or `→ Monthly
  on {date}`) with an "Undo" affordance that calls the same endpoint
  with the *current* `priceCode` to cancel the change (BE-11 accepts
  this as `PRICE_CHANGE_ALREADY_SCHEDULED` → returns idempotent
  cancellation).
- **Guardrails**:
  - Hide when `cancelAtPeriodEnd===true` (must resume first);
    tooltip explains.
  - Hide when `status !== 'ACTIVE'`.
  - `PRICE_CHANGE_ALREADY_SCHEDULED` on submit → toast + refetch.

## Idea of this task

Yearly saves money for committed users but must never trap them; the
design's "at period end" rule sidesteps proration math entirely. This
task keeps the UI honest by showing the exact effective date and the
exact next charge from the pricing preview — not a client computation.

## Reference to mockup

- Reuse the `checkout` screen's Monthly/Yearly toggle inside the
  dialog. The scheduled-change chip on the current-plan card uses the
  same style as the "Pending Invites · N" chip in the dashboard.

## Development steps

1. **MSW first.** Extend handlers:
   - POST `/api/billing/subscription/change-price` — updates the mock
     `billingMe` to a variant with `scheduledPriceCode` and
     `scheduledChangeAt=currentPeriodEnd`
   - Same endpoint with current `priceCode` clears the scheduled fields
   - Add `PRO_CANCEL_SCHEDULED` guard: returns
     `RESUME_NOT_ALLOWED` if the caller tries to change while
     cancelling
   - `dev.ts` + `prod.ts`: `changePrice(priceCode)`
2. **Hook.** `useChangePrice()` mutation invalidating `billingMe` and
   `pricing`.
3. **Components.**
   - `ChangeIntervalDialog.tsx` — reads pricing preview from UI-39's
     hook to show the next-charge amount; confirms; error handling
   - `ScheduledChangeBadge.tsx` — the chip on the current-plan card
     with an inline Undo button
4. **Page wiring.** Add the button to `SubscriptionManageCard` from
   UI-41; render `ScheduledChangeBadge` when applicable.
5. **Tests.**
   - `ChangeIntervalDialog.test.tsx` — shows target price + date;
     confirm triggers API; 409 handled; hidden when cancel scheduled.
   - `ScheduledChangeBadge.test.tsx` — renders correct label; Undo
     calls the endpoint with the current `priceCode`.
   - Hook: invalidates both `billingMe` and `pricing`.

## Final / expected result

- PRO monthly user can schedule a switch to yearly; the current-plan
  card shows the scheduled change; the "Undo" action reverts.
- Attempting to switch while cancellation is scheduled is blocked in
  the UI (button hidden with tooltip).
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Change price at period end | `POST /api/billing/subscription/change-price` (body `{ priceCode }`) |
| Pricing preview | `GET /api/billing/prices` (already cached from UI-39) |
| Refresh state | `GET /api/billing/me` |

**Backend gap:** none once BE-11 ships.
