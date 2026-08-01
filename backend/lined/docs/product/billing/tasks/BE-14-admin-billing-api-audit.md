# Task BE-14 — Admin Billing API + Audit + Permission Model

**Branch:** `feature/be-14-admin-billing-api-audit`

*Depends on BE-06 (subscriptions), BE-09 (webhook inbox for retry),
BE-13 (refunds — coordinate; BE-13 uses this task's `@RequiresPermission`
interceptor). Blocks UI-49.*

## Detailed description

Ship the admin billing surface (search, view, resync, retry event),
introduce a minimal permission model since Spring Security isn't in
use, and start writing to a `billing_audit_log` table on every
privileged action.

Scope:

1. Permission model (new — the codebase has `BuiltInRole` but no
   permissions):
   - `common/security/Permission` enum: `BILLING_READ`, `BILLING_OPS`,
     `BILLING_REFUND`, `FEATURE_FLAG_ADMIN`, `AUDIT_READ`
   - `user_permissions` join table: `user_id`, `permission`, `granted_by`,
     `granted_at`, `expires_at` (nullable), `reason`
   - `PermissionService.hasPermission(userId, permission)` reads from
     the join table
   - `@RequiresPermission("XXX")` annotation + `HandlerInterceptor`
     that reads `X-User-Id`, looks up permissions, and 403s if missing
   - Bootstrap: no permissions granted automatically; admins are
     granted via a raw SQL update or (after BE-14) via a new admin
     endpoint on the user module. This task ships a
     `PermissionAdminController` with `POST /api/admin/users/{userId}/permissions`
     (self-referential — an ADMIN with `AUDIT_READ` + `BILLING_OPS` can
     grant others). First admin permission is granted via SQL by an
     operator during rollout.
2. `billing_audit_log` table per §12.11 + `AuditService.record(...)`
   called from every admin action.
3. Admin endpoints under `billing/api/admin/`:
   - `GET /api/admin/billing/accounts?query=` — search by email,
     billing account id, provider customer id, provider subscription
     id, transaction id. Requires `BILLING_READ`.
   - `GET /api/admin/billing/accounts/{billingAccountId}` — full detail
     per §40.2. Requires `BILLING_READ`.
   - `POST /api/admin/billing/accounts/{billingAccountId}/resync` —
     calls `BillingReconciliationProvider.getSubscriptionSnapshot`,
     applies drift, records audit; returns before/after + changes.
     Requires `BILLING_OPS`.
   - `POST /api/admin/billing/provider-events/{eventId}/retry` — sets
     inbox row `processing_status=RECEIVED`, resets `attempt_count`,
     lets BE-09's processor pick it up. Requires `BILLING_OPS`.
   - `GET /api/admin/billing/audit-log?billingAccountId=&limit=` —
     requires `AUDIT_READ`.
4. Provider dashboard deep-link: the account detail response includes
   `providerDashboardUrl` if the adapter's capability advertises
   `customerPortal` or a dashboard link builder. Server validates and
   builds the URL — never accepts one from the client.

## Design references

- §40 Admin REST API
- §40.2 Account details
- §40.3 Manual resync
- §40.4 Retry failed event
- §41.3 Admin authorization matrix
- §12.11 `billing_audit_log`
- §47 Admin Panel Design

## Idea of this task

Support/ops need to see what a provider sees, unstick failed webhooks,
and act on refunds — but every action must be attributable and only
allowed to actors with the right permission. Introducing the smallest
permission model (enum + join table + annotation) that satisfies the
design's `BILLING_REFUND` requirement, paired with an audit log, gives
future admin surfaces (feature flags, user impersonation) a shared
mechanism.

## Development steps

1. Append `user_permissions` and `billing_audit_log` DDL to
   `schema.sql`.
2. Add `Permission` enum + `UserPermissionEntity` +
   `UserPermissionRepository`.
3. Add `PermissionService` + `RequiresPermission` annotation +
   `PermissionInterceptor` registered in `WebMvcConfigurer`.
4. Add `AuditService` + `BillingAuditLogEntity`.
5. Implement the four admin endpoints in a new
   `AdminBillingController`. The resync endpoint depends on BE-15's
   reconciliation service — inject an interface stub and land the real
   implementation in BE-15.
6. Add `PermissionAdminController` for the grant flow.
7. Tests.
8. Run `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- `@RequiresPermission("BILLING_REFUND")` protects BE-13's refund
  endpoints and returns 403 when missing.
- Admin can search, view, resync, and retry failed webhook events.
- Every privileged action writes a `billing_audit_log` row with
  before/after JSON snapshots (redacted — no card data, no full
  provider payloads).
- `./gradlew test`, `./gradlew checkstyleMain`, `./gradlew spotbugsMain`
  pass.

## REST API added / changed

| Purpose | Method + Path |
|---|---|
| Search billing accounts | `GET /api/admin/billing/accounts?query=` |
| View billing account details | `GET /api/admin/billing/accounts/{billingAccountId}` |
| Manual resync | `POST /api/admin/billing/accounts/{billingAccountId}/resync` |
| Retry failed webhook | `POST /api/admin/billing/provider-events/{eventId}/retry` |
| Audit log | `GET /api/admin/billing/audit-log?billingAccountId=&limit=` |
| Grant permission (bootstrap after first SQL admin) | `POST /api/admin/users/{userId}/permissions` |

## Tests to add

- **Unit — `PermissionInterceptorTest`**: missing `X-User-Id` → 401;
  user without permission → 403; user with permission → pass-through.
- **Unit — `AuditServiceTest`**: records action with sanitized
  before/after JSON.
- **Integration — `AdminSearchIT`** (Testcontainers): search by email
  matches; search by `provider_customer_id` matches; empty results
  return 200 with empty array.
- **Integration — `RetryFailedEventIT`**: seeded FAILED inbox event →
  retry endpoint resets it; processor re-runs.
- **Controller — `AdminBillingControllerAuthTest`**: cross-permission
  matrix per §41.3.
- **Controller — `PermissionAdminControllerBootstrapTest`**: first
  admin (granted via SQL) can grant `BILLING_REFUND` to a second admin.

## Risk & follow-ups

- The permission interceptor introduces a middleware layer. Ensure the
  webhook endpoint (BE-09) is excluded — it has no `X-User-Id`.
- Migrating the whole app to Spring Security is out of scope here; if
  that ever happens, the `Permission` enum + join table map cleanly to
  `GrantedAuthority`.
- Audit-log JSON size grows quickly; BE-15 or a follow-up should add a
  retention policy.
