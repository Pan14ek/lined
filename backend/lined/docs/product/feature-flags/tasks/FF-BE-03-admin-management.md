# FF-BE-03 — Feature-Flag Admin Management

**Branch:** `feature/feature-flags-admin`

**Dependencies:** [FF-BE-01](FF-BE-01-feature-flag-core.md). It may be
implemented in parallel with FF-BE-02 after the core contract is merged.

## Detailed description

Add a protected administration API for inspecting and changing the approved
flags in the deployment's active environment. Until bearer-token enforcement
exists, every admin request uses `X-User-Id` and verifies `ROLE_ADMIN` from the
database; hiding the UI is not security.

Updates use the backend's strict optimistic-concurrency convention and update
the local cache only after successful transaction commit.

## API contract

- `GET /api/admin/feature-flags`
- `GET /api/admin/feature-flags/{key}`
- `PATCH /api/admin/feature-flags/{key}` with `{ "enabled": true|false }`

Response fields are `key`, `environment`, `enabled`, `description`, `version`,
`updatedAt`, and `updatedBy`. PATCH requires `If-Match: "<version>"` and
returns the new ETag.

Expected failures: missing header `400` under the current MVP convention,
non-admin `403`, unknown key `404`, missing `If-Match` `428`, malformed ETag
or body `400`, and stale version `409`.

## Development steps

1. Add an admin-access policy that loads roles and rejects missing/unknown or
   non-admin identities without delegating trust to the frontend.
2. Add admin response/update DTOs; use nullable `Boolean` plus `@NotNull` so a
   missing field cannot silently mean `false`.
3. Implement list/get for only the active environment and approved catalog.
4. Implement PATCH with `VersionPrecondition`, entity `@Version`, and ETag
   response headers.
5. Add `feature_flag_audit_log` and record previous/new values, timestamp,
   active environment, and administrator identity snapshot in the same
   transaction.
6. Publish an application update event from the transaction and update the
   local cache with an `AFTER_COMMIT` listener. Rollback must leave the cache
   and audit history unchanged.
7. Reject arbitrary key creation/deletion and updates to another environment.
8. Document endpoints, headers, responses, and error cases in OpenAPI and
   `docs/foundation/api.md`.

## Expected result

Administrators can safely toggle known flags at runtime. Concurrent/stale
edits cannot silently overwrite each other, every committed change is
auditable, and the running instance observes the value only after commit.

## Test scenarios

- Admin can list/get the seven active-environment flags.
- Non-admin and unknown users receive `403`; missing identity follows the
  documented MVP missing-header response.
- Admin can update a known flag with a matching ETag and receives a new ETag.
- Missing/malformed/stale `If-Match` yields `428`/`400`/`409` respectively.
- Missing `enabled` yields validation `400`; unknown keys yield `404`.
- List/get/PATCH cannot access a different environment.
- Successful update writes exactly one audit entry with old/new values.
- Persistence or audit failure rolls back and does not update the cache.
- The after-commit listener updates the local cache after success.
- Concurrent admin updates allow one version and reject the stale request.
- Admin endpoints remain accessible when every product flag is disabled.

## Verification

From `backend/lined/` run:

```bash
./gradlew test
./gradlew check
```

Also run `git diff --check` from the monorepo root.

## Non-goals

No arbitrary flag CRUD, cross-environment editing, audit-history UI/API,
Bearer enforcement migration, targeting, or multi-instance transport.
