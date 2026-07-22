# FF-BE-01 — Feature-Flag Core

**Branch:** `feature/feature-flags-core`

**Dependencies:** None. This is the foundation for all other feature-flag
tasks.

## Detailed description

Create the Lined-native feature-flag persistence, cache, configuration, and
public query seam described in [Feature Flags](../feature-flags.md). This task
does not protect controllers or expose administration.

Use `io.backend.lined.featureflag` with the existing `api/domain/service`
layout. Store rows in PostgreSQL through `database/schema.sql`; do not add
Flyway/Liquibase. Persist timestamps as `OffsetDateTime`, use
`jakarta.transaction.Transactional`, and keep request reads database-free.

## API contract

Add unauthenticated `GET /api/features`:

```json
{
  "flags": {
    "dashboard.feature.enabled": true,
    "lobbies.feature.enabled": true,
    "calendars.feature.enabled": true,
    "tasks.feature.enabled": true,
    "notifications.feature.enabled": true,
    "settings.feature.enabled": true,
    "subscriptions.feature.enabled": true
  }
}
```

The response is built from an explicit public enum/allowlist, never from every
database row. Unknown/missing keys evaluate to `false`.

## Development steps

1. Define the seven stable keys and the four supported environments.
2. Add `feature_flags` with id, version, key, environment, enabled,
   description, `updated_at`, and `updated_by`; enforce unique key/environment.
3. Seed every approved key as enabled for `local`, `test`, `staging`, and
   `production` using idempotent `schema.sql` statements.
4. Add the entity, repository environment query, response DTO, mapper if
   needed, and query service.
5. Implement a thread-safe immutable snapshot with atomic `replaceAll` and
   single-key update. Returned maps must be immutable.
6. Add `FEATURE_FLAG_ENVIRONMENT` (default `local`) and configurable refresh
   delay (default `PT30M`) through configuration properties.
7. Load the active environment during startup. On failure, log and retain the
   current snapshot; startup must continue fail-closed.
8. Add the public controller and document the endpoint in OpenAPI and
   `docs/api.md`.

## Expected result

PostgreSQL is the persistent source of truth, while every normal evaluation is
an atomic in-memory lookup. Existing Lined features remain enabled after the
schema is deployed, and clients can retrieve only the approved public flags.

## Test scenarios

- Repository returns only rows from the requested environment.
- Duplicate `(flag_key, environment)` rows are rejected.
- Enabled and disabled values are read correctly; unknown keys return false.
- `replaceAll` removes stale entries atomically; `update` changes one key.
- Concurrent readers never observe a partially replaced snapshot.
- Returned snapshots cannot be mutated by callers.
- Successful startup load replaces the empty snapshot.
- Failed startup/refresh preserves the prior snapshot and permits startup.
- Public response contains exactly seven approved keys and no admin metadata.
- A stored internal/unknown row cannot leak through `GET /api/features`.
- Public response serialization matches the documented wire shape.

## Verification

From `backend/lined/` run:

```bash
./gradlew test
./gradlew check
```

Also run `git diff --check` from the monorepo root.

## Non-goals

No controller enforcement, admin API, audit log, PostgreSQL notification
listener, targeting, percentage rollout, or arbitrary flag creation.
