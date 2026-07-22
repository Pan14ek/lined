# FF-BE-02 — Feature Enforcement

**Branch:** `feature/feature-flags-enforcement`

**Dependencies:** [FF-BE-01](FF-BE-01-feature-flag-core.md).

## Detailed description

Enforce feature availability at the Spring MVC boundary without blocking
internal service-to-service calls. Add declarative controller/method metadata,
an interceptor, and the Lined RFC 7807 disabled-feature error contract.

Capability ownership and shared-read exceptions are authoritative in
[Feature Flags](../feature-flags.md). Do not infer ownership only from URL
prefixes: for example, lobby free slots belong to Calendar, while lobby
notification preferences belong to Notifications.

## Error contract

A disabled endpoint returns `503 Service Unavailable`:

```json
{
  "type": "https://errors.lined.app/feature.disabled",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "This feature is currently unavailable",
  "feature": "calendars.feature.enabled"
}
```

The controller method must not execute.

## Development steps

1. Add runtime-retained `@FeatureRequired` for controller types and methods.
2. Add `FeatureDisabledException` through the existing application exception
   layer and extend `GlobalExceptionHandler` without introducing a separate
   incompatible error format.
3. Implement a `HandlerInterceptor` that resolves method metadata first,
   class metadata second, and otherwise allows the handler.
4. Register it for `/api/**`; explicitly keep Auth, public discovery, admin
   flags, Actuator, static resources, and non-`HandlerMethod` handlers open.
5. Apply the capability matrix:
   - Calendar to `/api/calendar/**` and lobby free slots;
   - Tasks to `/api/tasks/**`;
   - Notifications to notification endpoints and lobby preferences;
   - Subscriptions to plan/subscription user flows;
   - Lobbies to mutations, membership, and invites, not shared lobby reads;
   - Settings to user profile/account mutations, not create/read/search;
   - no backend annotation for Dashboard yet.
6. Add OpenAPI `503` documentation to protected operations and update
   `docs/api.md` with the common error contract and ownership exceptions.
7. Add bounded blocked-request logging by known feature key.

## Expected result

Disabled public capabilities stop before controller execution and return one
stable machine-readable error. Shared reads and internal domain integrations
continue to support other enabled features.

## Test scenarios

- Non-`HandlerMethod` and unannotated handlers are allowed.
- Enabled method/class annotations allow normal execution.
- Disabled method/class annotations return the documented `503` response.
- Method-level metadata takes precedence over class-level metadata.
- Every backend-backed capability has at least one enabled and disabled MVC
  test, including Calendar free slots and lobby notification preferences.
- Lobby shared reads remain available while Lobby management is disabled.
- User create/read/search remain available while Settings is disabled.
- Auth, public feature discovery, admin flags, and Actuator are never blocked.
- The protected controller/service is not invoked after rejection.
- An internal service call continues when the public feature is disabled.
- Unknown keys fail closed and produce bounded diagnostic logging.

## Verification

From `backend/lined/` run:

```bash
./gradlew test
./gradlew check
```

Also run `git diff --check` from the monorepo root.

## Non-goals

No service-layer blanket checks, authorization replacement, dependency graph,
admin mutation API, or cross-instance cache propagation.
