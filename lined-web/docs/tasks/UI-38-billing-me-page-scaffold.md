# Task 38 — Billing Feature Scaffold + `/api/billing/me`

**Branch:** `feature/ui-38-billing-me-page-scaffold`

*Depends on backend BE-04 (`GET /api/billing/me`). Supersedes the
first half of Task 14 (subscription page prototype) and part of
Task 26 (payment checkout). Batch 38–50 (billing, 2026-07): land
first — every other UI-38..UI-50 task builds on this feature folder.*

## Detailed description

Replace `src/features/subscription/` with a new
`src/features/billing/` feature and re-point the `/subscription` route
at it. The new page renders the authenticated billing snapshot
(`GET /api/billing/me`) — effective plan, subscription status, grace
deadline, plan limits — and provides the shared toast primitive every
following billing task will use for feedback.

- **Header card** — plan badge ("FREE" / "PRO"), subscription status
  ("Active", "Cancels on {date}", "Payment past due — grace ends {date}",
  "Free"), Free/Pro limit summary ("1 lobby · 4 members" or "10 · 20").
- **Upgrade CTA** — visible only when `effectivePlan=FREE` and
  `rollout.uiEnabled=true`; opens the pricing card from UI-39
  (placeholder button in this task).
- **Manage-your-plan region** — placeholder card for cancel/resume
  (UI-41), change interval (UI-42), payment portal (UI-48). Buttons
  disabled with tooltip "Coming with UI-41/42/48".
- **Toast primitive** — introduce `sonner` (or a small in-house
  provider — pick sonner unless the shadcn team has a preference)
  mounted at the app root. `billing/lib/toast.ts` wraps it as
  `notify.success(msg)` / `notify.error(msg)` so tests can spy
  centrally.
- **Rollout gate** — when `rollout.uiEnabled=false`, the page renders
  a single "Billing is not available yet" message; the settings-menu
  link is hidden.

## Idea of this task

Every following billing UI task needs the same feature folder, the same
data shape from `/api/billing/me`, and consistent error/toast feedback.
Landing scaffold + minimum render + toast primitive in one task means
UI-39..UI-50 are additive on a coherent base and never accumulate an
inconsistent "banner or toast or inline?" decision.

## Reference to mockup

- Reuse existing `subscription` screen
  (`http://localhost:4321/#subscription`) as the layout baseline. The
  new page is a strict superset: same left column, same card grid
  frame; the plan cards / history region will be filled by UI-39 /
  UI-47.

## Development steps

1. **MSW first.** Under `src/features/billing/api/`, add:
   - `mockData.ts` — a `MOCK_BILLING_ME` seed (default FREE, then
     variants: PRO_ACTIVE, PRO_CANCEL_SCHEDULED, PAST_DUE_IN_GRACE)
   - `handlers.ts` — GET `/api/billing/me` returning the FREE variant
     by default; expose a `setBillingMeVariant(name)` helper for tests
   - `dev.ts` + `prod.ts` + `index.ts` following the existing feature
     convention (matching `src/features/subscription/api/`)
   - `model/index.ts` — TS types matching the backend `BillingMeDto`
     shape (BE-04 + BE-11 populated `subscription`, BE-15 populated
     `rollout`)
2. **Hook.** Add `src/features/billing/hooks/useBillingMe.ts` — a
   TanStack `useQuery` reading `GET /api/billing/me`; key in
   `src/features/billing/lib/constants.ts` `QUERY_KEYS.billingMe = ['billing','me'] as const`.
3. **Toast provider.** Install sonner and mount `<Toaster />` in
   `src/App.tsx`. Add `src/lib/toast.ts` — thin `notify` façade over
   `toast.success/error`. Do **not** modify any `src/components/ui/`
   file.
4. **Page.** `src/features/billing/pages/BillingPage.tsx` — replaces
   the current `SubscriptionPage`. Uses `useBillingMe`, renders header
   card + rollout gate + placeholder region. Keep the file name
   `BillingPage` but keep the route path `/subscription` (users bookmark
   it) and re-export from `src/features/billing/pages` in
   `src/router.tsx`.
5. **Route rewire.** Update `src/router.tsx` — `/subscription` now
   loads `BillingPage`. Delete the old route only after the new page's
   tests are green.
6. **Feature-folder cleanup.** Under
   `src/features/subscription/` — leave the folder in place with a
   single `README.md` "superseded by src/features/billing/" (so tests
   from earlier tasks that still reference the old exports fail
   loudly). UI-47 removes the old cards; do not delete them in this
   task.
7. **Settings link.** In `src/features/settings/` update the
   preferences menu — the link continues to point at `/subscription`
   but the label changes to "Billing".
8. **Tests.** Under `src/features/billing/pages/__tests__/`:
   - `BillingPage.test.tsx` — renders FREE header, renders PRO_ACTIVE
     header, renders PAST_DUE grace deadline copy, renders rollout-off
     placeholder, upgrade CTA hidden when disabled
   - `useBillingMe.test.tsx` — 200 populates cache; 500 sets error;
     `enabled` respects `rollout.uiEnabled`
   - Toast: assert `notify.error(...)` is called via a spy when the
     query rejects with 5xx

## Final / expected result

- `/subscription` renders the new billing page against `GET
  /api/billing/me`; FREE, PRO active, PRO cancel-scheduled, PAST_DUE
  states all display correctly.
- Toast primitive is mounted globally; billing errors surface as a
  toast; the `notify` façade is the only import site.
- `rollout.uiEnabled=false` hides the billing UI entirely (page shows
  a neutral notice, sidebar link hidden).
- No existing test breaks.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Current billing state | `GET /api/billing/me` → `{ billingAccountId, effectivePlan, subscription (nullable), limits, rollout }` |

**Backend gap:** none — BE-04 (foundation) + BE-11 (subscription
population) + BE-15 (rollout field) provide this endpoint. If BE-15
isn't shipped yet, treat `rollout` as always-enabled and add a TODO
referencing BE-15.
