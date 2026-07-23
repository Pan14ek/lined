# Task 49 — Admin Billing View

**Branch:** `feature/ui-49-admin-billing-view`

*Depends on Task 38 (scaffold). Backend BE-14 (admin API + permission
model). Precedes Task 50 (admin refund reuses the account detail
page).*

## Detailed description

A new `/admin/billing` route surfaces the admin operations from
design §40 to authorized support/ops users: search accounts, view
account detail, resync, retry failed events, view audit log.

- **Route guard** — new `<RequireAdmin />` component that checks the
  current user's `permissions` (added to `useCurrentUser`) — the
  route renders only when `BILLING_READ` is present; otherwise 404 to
  avoid leaking the existence of admin surfaces.
- **Search page** (`/admin/billing`) — single search input; hits
  `GET /api/admin/billing/accounts?query=`. Results table:
  billing-account-id, owner email, effective plan, subscription
  status, provider customer id.
- **Account detail** (`/admin/billing/accounts/{billingAccountId}`) —
  four sections:
  1. **Overview** — owner, effective plan, subscription status +
     dates, provider ids, scheduled changes, `providerDashboardUrl`
     as an external link.
  2. **Transactions** — a paginated list identical shape to UI-47
     but read from the admin endpoint.
  3. **Provider events** — recent inbox rows with status + retry
     button (`POST /api/admin/billing/provider-events/{eventId}/retry`)
     visible only when caller has `BILLING_OPS`.
  4. **Audit log** — recent audit rows with actor + action; visible
     only when caller has `AUDIT_READ`.
- **Resync button** — top-right of overview; `POST
  /api/admin/billing/accounts/{billingAccountId}/resync`; result modal
  shows before/after diff + warnings. Requires `BILLING_OPS`.

## Idea of this task

Instead of shell scripts and psql access, ops needs a page where the
routine "why is this user stuck?" question can be answered in three
clicks. Keeping the surface strictly read-only + resync + retry (not
refund — that's UI-50) makes the security review manageable.

## Reference to mockup

- No mockup — utility-first admin layout using shadcn `Table` +
  `Card`. Sketch in PR description.

## Development steps

1. **MSW first.** New `src/features/admin/api/handlers.ts`:
   - GET `/api/admin/billing/accounts?query=` — array of matches
   - GET `/api/admin/billing/accounts/{id}` — full detail mock
   - POST `.../resync` — returns mock diff
   - POST `/api/admin/billing/provider-events/{eventId}/retry`
   - `dev.ts` + `prod.ts` mirror.
2. **Feature folder.** `src/features/admin/billing/`:
   - `model/index.ts` — DTO types
   - `hooks/` — `useAdminSearch`, `useAdminAccount`, `useResync`,
     `useRetryEvent`
   - `pages/AdminBillingSearchPage.tsx`,
     `AdminBillingAccountPage.tsx`
   - Section components: `AdminAccountOverview`,
     `AdminTransactionsSection`, `AdminProviderEventsSection`,
     `AdminAuditLogSection`
3. **Auth.** Extend `useCurrentUser` (in `src/features/users/`) to
   include `permissions: Permission[]` from backend (BE-14 adds this
   field to the user endpoint). Add `<RequireAdmin />` wrapping the
   admin routes; 404 when permission missing.
4. **Route.** Register `/admin/billing` + `/admin/billing/accounts/:id`
   in `src/router.tsx` under `<RequireAuth /> → <RequireAdmin
   permission="BILLING_READ" />`.
5. **Sidebar link.** New "Admin" section in the sidebar, visible only
   when caller has any admin permission.
6. **Tests.**
   - `RequireAdmin.test.tsx` — permission present → renders;
     missing → 404 route.
   - `AdminBillingSearchPage.test.tsx` — types in search, hits
     endpoint, renders results.
   - `AdminBillingAccountPage.test.tsx` — renders all four sections;
     retry button hidden without `BILLING_OPS`; resync opens diff
     modal on success.
   - `useResync.test.tsx` — success + failure paths.

## Final / expected result

- `/admin/billing` surfaces search + account detail + resync + event
  retry per §40.
- Route + retry + audit visibility respect the permission matrix from
  §41.3.
- Non-admin users get a 404 for the admin routes.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Search accounts | `GET /api/admin/billing/accounts?query=` |
| Account detail | `GET /api/admin/billing/accounts/{billingAccountId}` |
| Resync | `POST /api/admin/billing/accounts/{billingAccountId}/resync` |
| Retry event | `POST /api/admin/billing/provider-events/{eventId}/retry` |
| Audit log | `GET /api/admin/billing/audit-log?billingAccountId=&limit=` |
| Current user permissions | extend existing user endpoint to include `permissions` |

**Backend gap:** the "current user permissions" field must be included
in whatever endpoint powers `useCurrentUser`. BE-14 owns adding this;
coordinate.
