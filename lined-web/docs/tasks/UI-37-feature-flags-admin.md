# Task 37 — Feature-Flag Administration

**Branch:** `feature/ui-37-feature-flags-admin`

**Dependencies:** [UI-35](UI-35-feature-flags-foundation.md),
[UI-36](UI-36-feature-gated-capabilities.md), backend
[FF-BE-03](../../../backend/lined/docs/tasks/FF-BE-03-admin-management.md),
and backend
[FF-BE-04](../../../backend/lined/docs/tasks/FF-BE-04-runtime-synchronization.md)
for the complete multi-instance release behavior.

## Detailed description

Add an always-available administrator page at `/admin/feature-flags` for the
approved flag catalog in the active backend environment. The UI role guard is
for navigation and user experience; the backend `ROLE_ADMIN` check remains
authoritative.

The page edits only returned known flags. It cannot create/delete keys or
switch another environment. Changes are pessimistic: retain the last confirmed
state until PATCH succeeds.

## API contract

Use:

- `GET /api/admin/feature-flags`
- `GET /api/admin/feature-flags/{key}` when a focused refresh is useful
- `PATCH /api/admin/feature-flags/{key}` with `{ "enabled": boolean }`
  and `If-Match: "<version>"`

Admin rows contain `key`, `environment`, `enabled`, `description`, `version`,
`updatedAt`, and `updatedBy`. The page must not infer an ETag from array order;
construct the quoted ETag from the row's version.

## Development steps

1. Extend `features/featureFlags/` admin model/API/dev/MSW surface while
   preserving exact dev/prod signatures.
2. Add admin list/update TanStack Query hooks. On success, update/refetch both
   the admin list and public flags; on `409`, refetch before allowing retry.
3. Add an admin-only route guard based on `useCurrentUser().roles` and an
   admin-only navigation entry outside Settings/product flags.
4. Build an accessible table/list showing active environment, human
   description, state switch, version, update time, and updater.
5. Disable only the affected control while its request is pending. Do not
   optimistically flip the confirmed state.
6. Show explicit stale-update guidance for `409`, authorization guidance for
   `403`, missing-key handling for `404`, and a recoverable generic error for
   other failures.
7. Keep the admin route usable when Dashboard, Settings, or every product
   capability is disabled.
8. Add English/Ukrainian labels, descriptions around impact, and accessible
   switch names that include the feature name and current state.

## Final / expected result

An administrator can inspect and safely toggle every approved capability in
the active environment. Confirmed state and metadata refresh after success;
stale/conflicting or failed requests never leave a misleading switch value.
Non-admin users cannot discover the navigation entry and cannot use a direct
URL or backend request to administer flags.

## Test scenarios

- Admin sees the navigation entry and seven returned rows; non-admin does not.
- Admin direct route loads; non-admin direct route redirects to `/`.
- Missing/loading current-user roles do not flash admin content.
- Page renders one active environment and all row metadata accessibly.
- Toggle sends the correct key, boolean body, `X-User-Id`, and quoted
  `If-Match` version.
- Pending update keeps the last confirmed state and disables only that switch.
- Successful update displays server-returned state/version/metadata and
  invalidates public flags.
- `409` restores/refetches current state and shows stale-update guidance.
- `403`, `404`, and generic server/network errors preserve confirmed state and
  show the appropriate recoverable message.
- Concurrent toggles for different rows do not block each other.
- The page remains accessible to an admin when all seven public flags are off.
- No control exists for arbitrary key creation, deletion, or environment
  switching.

## Verification

From `lined-web/` run:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Verify admin/non-admin direct routing and the all-flags-disabled state with
MSW. Also run `git diff --check` from the monorepo root.

## Non-goals

No audit-history viewer, arbitrary flag CRUD, environment switching, targeting,
scheduled changes, dependency graph, or replacement of backend authorization.
