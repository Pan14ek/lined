# Feature Flags Context

## Purpose

Feature flags let Lined make an approved user-facing capability temporarily unavailable without
rebuilding the backend. They are capability availability controls, not authorization or a
replacement for domain validation.

## Runtime and usage

`FeatureFlagService` evaluates requests from `FeatureFlagSnapshot`, an immutable in-memory map.
The initial snapshot is loaded at application startup from the deployment's active environment;
normal reads never query PostgreSQL. Missing or unknown keys evaluate to `false`. A failed load or
later refresh keeps the previous snapshot and therefore starts fail-closed when no prior snapshot
exists.

`GET /api/features` is unauthenticated and exposes exactly the seven approved public keys. It is
safe for clients to call during capability discovery because it returns only cached booleans and
never administration metadata.

`@FeatureRequired` declares a controller or method capability. The MVC interceptor evaluates that
metadata before controller execution, with method metadata taking precedence over controller
metadata. A disabled capability returns the standard RFC 7807 `503 feature.disabled` response;
the interceptor does not wrap or block direct service-to-service calls.

## Responsibilities

- `featureflag/domain` owns the stable key/environment catalog, JPA entity, and repository.
- `featureflag/service` owns active-environment configuration, atomic cache replacement, public
  allowlisting, startup loading, and the recovery-refresh seam.
- `featureflag/api` owns public discovery plus MVC enforcement metadata, interception, bounded
  blocked-request diagnostics, and generated OpenAPI `503` response documentation.
- FF-BE-02 enforces Calendar, Tasks, Notifications, Subscriptions, selected Lobby management,
  and Settings mutations at the HTTP boundary. Shared lobby reads, user create/read/search, Auth,
  discovery, the future admin control plane, and direct internal service calls remain open.
- FF-BE-03 owns administrator mutation/audit; FF-BE-04 owns PostgreSQL synchronization, scheduled
  recovery refresh, and related operational metrics.

## Persistence and data flow

`database/schema.sql` creates `feature_flags`, uniquely keyed by `(flag_key, environment)`, and
seeds all approved flags as enabled for `LOCAL`, `TEST`, `STAGING`, and `PRODUCTION`. The durable
`updated_by` value is an administrator identity snapshot rather than a mutable user relationship.

On startup or an explicit future refresh, the repository reads all rows for the configured
environment and the service atomically replaces the cache. `GET /api/features` then evaluates the
explicit `FeatureFlagKey` allowlist against that cache, so unapproved or internal rows cannot
reach clients.

## Interactions and authoritative links

- [Feature-flag design](feature-flags.md) defines the catalog, capability matrix, and later work.
- [FF-BE-01](tasks/FF-BE-01-feature-flag-core.md) defines the implemented core task.
- [Backend API reference](../../foundation/api.md#features) documents public discovery.
- [FF-BE-02](tasks/FF-BE-02-feature-enforcement.md),
  [FF-BE-03](tasks/FF-BE-03-admin-management.md), and
  [FF-BE-04](tasks/FF-BE-04-runtime-synchronization.md) define the dependent follow-up work.
