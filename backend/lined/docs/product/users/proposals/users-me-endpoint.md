# API Proposal — `GET /api/users/me`

**Branch:** `feature/users-me-endpoint`
**Status:** Implemented
**Motivation:** The web client can resolve the profile without supplying its
own user ID. This delivery replaces the former `GET /api/users/{id}` caller
lookup with a controller-faithful `GET /api/users/me` contract.

## Implemented API behavior

Return the profile of the **caller**, resolved from the request identity
instead of a client-supplied id:

- Resolves from the validated Bearer JWT subject through the backend
  `CurrentUserProvider`; the endpoint does not accept a caller-supplied ID.

```
GET /api/users/me
→ 200 UserDto { id, username, email, createdAt, roles, activePlan, activeUntil }
```

**Errors:** `401` when authentication is missing or invalid; `404` when the identity does
not resolve to an account (e.g. deleted account with a stale token/header).

## Why it matters

- Removes the last place the client must send its own user id explicitly;
  conflicting identity headers are ignored.
- Keeps `docs/foundation/api.md` controller-faithful with an implemented caller-scoped
  profile contract.
- AUTH-SEC-08 switches the web `useCurrentUser()` hook from `users/{id}` to
  `users/me` and completes memory-only token storage and cache isolation.

## Implementation notes

- `UserController#me()` delegates to the existing user lookup service;
  Controller → Service → Repository layering and `EntityFinder` remain intact.
- The endpoint binds the authenticated security context through the shared
  identity adapter. Controller and integration tests cover the happy path,
  missing authentication, unknown subject, and spoofed-header behavior.

## Delivered

`GET /api/users/me` returns the caller's `UserDto`; `docs/foundation/api.md` matches the
implementation; Checkstyle/SpotBugs/JaCoCo verification is recorded with the
feature delivery.
