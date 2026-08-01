# Feature Flags

## Purpose

Lined uses persistent runtime feature flags to make a user-facing capability
available or unavailable without rebuilding or restarting the backend. The
backend is authoritative: the web client hides unavailable UI, while the
backend independently rejects protected HTTP requests.

The first version is an application-owned boolean flag system. It is not an
authorization mechanism, experiment framework, or replacement for domain
validation.

## Lined-specific decisions

- PostgreSQL stores the authoritative value for each environment.
- Every backend instance evaluates requests from an immutable in-memory
  snapshot; request-time evaluation never queries PostgreSQL.
- Admin updates change the database first and update caches only after commit.
- PostgreSQL `LISTEN/NOTIFY` prompts every instance to reload after a change;
  a configurable 30-minute full refresh repairs missed notifications.
- Unknown or missing flags fail closed.
- Existing capabilities are seeded as enabled in `local`, `test`, `staging`,
  and `production`, preserving current product behavior on deployment.
- Auth, `GET /api/features`, and `/api/admin/feature-flags/**` are always
  available and cannot be protected by a feature flag.

This design follows the existing backend conventions: root package
`io.backend.lined`, `api/domain/service` layers, `schema.sql`,
`OffsetDateTime`, `jakarta.transaction.Transactional`, application
exceptions, and RFC 7807 `ProblemDetail` responses.

## Flag catalog

| Key | User-facing meaning | Backend scope |
|---|---|---|
| `dashboard.feature.enabled` | Authenticated Dashboard content | UI-only until a dashboard endpoint ships |
| `lobbies.feature.enabled` | Lobby pages, management, membership, and invites | Lobby mutations and invite/member operations |
| `calendars.feature.enabled` | Global/lobby calendars, event actions, and free-slot flows | `/api/calendar/**` and lobby free-slot calculation |
| `tasks.feature.enabled` | Global Tasks board, lobby Tasks tab, and task actions | `/api/tasks/**` |
| `notifications.feature.enabled` | Notification inbox and preference controls | `/api/notifications/**` and lobby notification preferences |
| `settings.feature.enabled` | User settings and account-management flows | User profile/account mutation endpoints |
| `subscriptions.feature.enabled` | Plans, current subscription, and subscription history | Plan/subscription user flows |

The key name is stable API data. Renaming a key requires a coordinated data,
backend, and web migration.

## Capability boundaries

Flags protect business capabilities, not every class or table in a domain.
Shared reads remain available where another enabled capability needs them.

| Surface | Required flag | Notes |
|---|---|---|
| `POST/PATCH/DELETE /api/lobbies/**` | Lobbies | Includes member removal and lobby deletion |
| Lobby invite create/list/resend/cancel/accept/decline | Lobbies | Invite notifications do not change ownership of the operation |
| `GET /api/lobbies/mine` and `GET /api/lobbies/{id}` | None | Calendar and Tasks selectors need shared lobby data |
| `GET /api/lobbies/{id}/free-slots` | Calendars | This is a calendar availability operation |
| `/api/calendar/**` | Calendars | All public event/conflict operations |
| `/api/tasks/**` | Tasks | All public task operations |
| `/api/notifications/**` | Notifications | Inbox and global preferences |
| `/api/lobbies/{id}/notification-preferences` | Notifications | Method/controller ownership overrides the lobby path |
| User profile/account `PATCH` and `DELETE` | Settings | User create/read/search remain shared/auth support |
| Plan/subscription user flows | Subscriptions | Admin feature-flag management remains independent |
| `/api/auth/**`, `/api/features`, `/api/admin/feature-flags/**` | None | Stable access and control plane |

Internal service calls are not intercepted. For example, disabling Calendar
blocks Calendar HTTP controllers but does not prevent an internal service or
scheduled job from using event-domain services. A future need to stop an
internal integration requires a separate flag with that exact meaning.

## Persistence and environments

`feature_flags` stores one row per key and environment. Required fields are:

- generated id and optimistic-lock `version`;
- `flag_key`, `environment`, `enabled`, and a stable description;
- `updated_at` as `TIMESTAMPTZ` / `OffsetDateTime`;
- `updated_by` as a durable administrator identity snapshot.

`(flag_key, environment)` is unique. `feature_flag_audit_log` records the
previous/new value, change timestamp, and administrator identity in the same
transaction as the update.

The active environment is configured with
`FEATURE_FLAG_ENVIRONMENT`, defaulting to `local`. Supported values are
`local`, `test`, `staging`, and `production`. Admin endpoints operate only on
the active environment; v1 does not edit another deployment's environment.

## Public API

`GET /api/features` is unauthenticated, reads only the local cache, and returns
an explicit allowlist:

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

Administrative metadata, hidden/internal flags, audit records, and targeting
data are never returned by this endpoint.

## Admin API

All admin endpoints require `X-User-Id` and verify `ROLE_ADMIN` in the backend:

- `GET /api/admin/feature-flags`
- `GET /api/admin/feature-flags/{key}`
- `PATCH /api/admin/feature-flags/{key}` with `{ "enabled": true|false }`

Responses contain `key`, `environment`, `enabled`, `description`, `version`,
`updatedAt`, and `updatedBy`. PATCH requires a quoted numeric `If-Match`
value derived from `version` and returns the updated resource with an `ETag`.

Expected failures are `400` for malformed input/ETag, `403` for a non-admin,
`404` for an unknown key, `409` for a stale version, and `428` when
`If-Match` is missing. V1 cannot create or delete arbitrary keys.

## HTTP enforcement and errors

`@FeatureRequired` may be placed on a controller or method. Method-level
metadata takes precedence, allowing a shared controller/path to identify the
real capability owner. A Spring MVC interceptor evaluates the selected
handler before controller execution.

Disabled requests return `503 Service Unavailable` as RFC 7807:

```json
{
  "type": "https://errors.lined.app/feature.disabled",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "This feature is currently unavailable",
  "feature": "calendars.feature.enabled"
}
```

The status expresses temporary capability availability; it must not be
reported as authorization failure. Blocked-request logging is bounded or
sampled to avoid log floods.

## Cache lifecycle and propagation

1. At startup, load all rows for the active environment and atomically replace
   the immutable snapshot.
2. If startup loading fails, keep the empty fail-closed snapshot, start the
   application, and expose the failure through logs and metrics.
3. An admin update persists the row and audit record in one transaction.
4. After commit, update the local snapshot and publish a PostgreSQL
   notification containing the environment and change identity.
5. Every matching backend instance reloads the complete environment snapshot.
6. Every 30 minutes by default, each instance performs a full recovery refresh.

A failed reload preserves the previous snapshot; an empty replacement is only
valid when the database successfully returned zero rows. The listener and
publisher live behind adapters so normal H2 tests do not require PostgreSQL.

## Web behavior

The web app owns a `features/featureFlags/` feature with the public API model,
mock/dev implementations, TanStack Query hook, query keys, and guards.

- Cache flags for five minutes, poll every ten minutes, and refetch on focus.
- Do not render flagged routes/actions while initial discovery is loading.
- On discovery failure, show a retry state rather than assuming enabled.
- Unknown public keys are disabled.
- A protected API `503 feature.disabled` invalidates the public-flags query.
- Disabled non-Dashboard routes redirect to `/` with a neutral message.
- `/` remains a stable authenticated landing path. If Dashboard is disabled,
  it renders minimal navigation/sign-out and an admin link for administrators,
  avoiding a redirect loop when all product flags are disabled.
- The admin page is always routable but is hidden/guarded for non-admin users;
  backend role checking remains authoritative.

## Observability

Record bounded logs and Micrometer metrics for refresh successes/failures,
last successful refresh, blocked requests by known feature key, and current
state. Do not place user ids, paths, arbitrary keys, or other unbounded data in
metric labels.

## Non-goals

V1 excludes percentage rollout, per-user/role targeting, A/B or multivariate
flags, arbitrary flag creation, dependency graphs, WebSocket/SSE frontend
updates, Redis/Kafka propagation, automatic expiry, OpenFeature adoption, and
third-party feature-management platforms.

## Implementation tasks

- [Core persistence, cache, and public API](tasks/FF-BE-01-feature-flag-core.md)
- [HTTP capability enforcement](tasks/FF-BE-02-feature-enforcement.md)
- [Admin management and audit](tasks/FF-BE-03-admin-management.md)
- [Multi-instance synchronization](tasks/FF-BE-04-runtime-synchronization.md)
- [UI foundation](../../../../../lined-web/docs/tasks/UI-35-feature-flags-foundation.md)
- [UI capability integration](../../../../../lined-web/docs/tasks/UI-36-feature-gated-capabilities.md)
- [UI administration](../../../../../lined-web/docs/tasks/UI-37-feature-flags-admin.md)
