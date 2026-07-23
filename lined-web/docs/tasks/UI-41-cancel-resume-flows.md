# Task 41 — Cancel + Resume Subscription

**Branch:** `feature/ui-41-cancel-resume-flows`

*Depends on Task 38 (billing scaffold). Backend BE-11 (cancel + resume
endpoints).*

## Detailed description

Give a PRO user the two symmetric actions: schedule cancellation at
the current period end, and resume a scheduled cancellation before it
takes effect. Both actions surface the exact provider timestamp so the
user knows precisely when access changes.

- **Cancel button** — visible when `subscription.status==='ACTIVE'`
  and `cancelAtPeriodEnd===false`. Opens `ConfirmDialog` (existing
  shared component) with copy:
  > "Cancel your Pro subscription? You'll keep Pro until
  > **{formattedCurrentPeriodEnd}**. After that, you drop to Free and
  > any lobbies above the Free limit become read-only for 30 days
  > before being archived."
  Confirm → `POST /api/billing/subscription/cancel`. Success:
  invalidate `billingMe`, toast "Cancellation scheduled for {date}".
- **Resume button** — visible when `cancelAtPeriodEnd===true` and
  `now < currentPeriodEnd`. Confirm dialog:
  > "Resume renewal? Your Pro subscription will renew automatically
  > on **{formattedCurrentPeriodEnd}**."
  Confirm → `POST /api/billing/subscription/resume`. Success: toast
  "Renewal resumed".
- **Cancelled banner** — when `cancelAtPeriodEnd===true`, show a
  neutral (not error-colored) banner: "Pro ends on {date}. You can
  resume anytime before then."
- **Error handling** — 409 `SUBSCRIPTION_NOT_ACTIVE`,
  `CANCELLATION_ALREADY_SCHEDULED`, `RESUME_NOT_ALLOWED` → toast with
  the stable code and a friendly message; refresh `billingMe`.

## Idea of this task

Cancelling should not feel like a trap — showing the exact
end-of-access instant, and offering resume until then, is the
minimum-viable "user in control" experience. Both actions being one
call and one toast keeps the surface small.

## Reference to mockup

- Reuse the `subscription` screen's current-plan card treatment. The
  cancel action mirrors the existing danger-secondary button style
  used on lobby settings; the resume action uses the primary brand
  button.

## Development steps

1. **MSW first.** Extend `src/features/billing/api/handlers.ts`:
   - POST `/api/billing/subscription/cancel` — updates the mock
     `billingMe` to `PRO_CANCEL_SCHEDULED` variant; returns the new
     snapshot
   - POST `/api/billing/subscription/resume` — flips it back to
     `PRO_ACTIVE`; error variants: 409 `SUBSCRIPTION_NOT_ACTIVE`
     when starting from FREE; 409 `RESUME_NOT_ALLOWED` when
     `now >= currentPeriodEnd`
   - `dev.ts` + `prod.ts`: `cancelSubscription()`, `resumeSubscription()`
2. **Hooks.** `useCancelSubscription()`, `useResumeSubscription()` —
   both `useMutation` with `onSuccess: invalidateBillingMe`;
   surface stable error codes to callers.
3. **Components.**
   - `SubscriptionManageCard.tsx` — houses the cancel / resume
     buttons; consumes `billingMe.subscription`.
   - `CancelSubscriptionDialog.tsx` — wraps `ConfirmDialog` with the
     copy above; formats the date via `formatDate` shared util
     (locale-aware from UI-24).
   - `ResumeSubscriptionDialog.tsx` — same pattern.
   - `CancellationScheduledBanner.tsx` — neutral banner shown when
     `cancelAtPeriodEnd`.
4. **Page wiring.** Render `SubscriptionManageCard` + banner in
   `BillingPage`.
5. **Tests.**
   - `CancelSubscriptionDialog.test.tsx` — confirm calls the API,
     success toasts; 409 shows error toast without changing state.
   - `ResumeSubscriptionDialog.test.tsx` — parallel coverage.
   - `SubscriptionManageCard.test.tsx` — button visibility across
     FREE, ACTIVE, ACTIVE+cancel scheduled, PAST_DUE states.
   - Hook tests: query invalidation after success.

## Final / expected result

- PRO user can schedule cancel; sees banner with exact end date; can
  resume until then.
- Post-period elapses (mocked via variant swap) → the account drops
  to FREE per BE-11 + BE-12; UI updates via `billingMe` refetch.
- Stable error codes surfaced as friendly toasts.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Schedule cancellation | `POST /api/billing/subscription/cancel` |
| Resume scheduled cancellation | `POST /api/billing/subscription/resume` |
| Refresh state | `GET /api/billing/me` |

**Backend gap:** none once BE-11 ships.
