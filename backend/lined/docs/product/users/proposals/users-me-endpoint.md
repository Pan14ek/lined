# API Proposal — `GET /api/users/me`

**Branch:** `feature/users-me-endpoint`
**Status:** Implemented
**Motivation:** The web client can resolve the profile without supplying its
own user ID. This delivery replaces the former `GET /api/users/{id}` caller
lookup with a controller-faithful `GET /api/users/me` contract.

## Implemented API behavior

Return the profile of the **caller**, resolved from the request identity
instead of a client-supplied id:

- MVP path: resolves from the `X-User-Id` header.
- Token path: once request filtering validates the `POST /api/auth/login`
  Bearer token, resolve from the token subject — the endpoint contract does
  not change.

```
GET /api/users/me
→ 200 UserDto { id, username, email, createdAt, roles, activePlan, activeUntil }
```

**Errors:** `400` when no identity is supplied; `404` when the identity does
not resolve to an account (e.g. deleted account with a stale token/header).

## Why it matters

- Removes the last place the client must send its own user id explicitly,
  which is a prerequisite for retiring the `X-User-Id` header.
- Keeps `docs/foundation/api.md` controller-faithful with an implemented caller-scoped
  profile contract.
- The web `useCurrentUser()` hook switches from `users/{id}` to `users/me`
  with no other client change.

## Implementation notes

- `UserController#me()` delegates to the existing user lookup service;
  Controller → Service → Repository layering and `EntityFinder` remain intact.
- The endpoint binds the existing MVP header directly. A shared identity resolver
  and Bearer-token request filtering remain future work.
- Controller tests cover the happy path, missing header, and unknown id.

## Delivered

`GET /api/users/me` returns the caller's `UserDto`; `docs/foundation/api.md` matches the
implementation; Checkstyle/SpotBugs/JaCoCo verification is recorded with the
feature delivery.
