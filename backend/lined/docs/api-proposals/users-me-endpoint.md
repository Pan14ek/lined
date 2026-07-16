# API Proposal — `GET /api/users/me`

**Branch:** `feature/users-me-endpoint`
**Status:** Proposed
**Motivation:** `docs/api.md` already documents this endpoint ("Get Current
User"), but no controller implements it — the docs are ahead of the code.
The web client currently resolves the profile with `GET /api/users/{id}`
using the id stored at sign-in.

## What the API should do

Return the profile of the **caller**, resolved from the request identity
instead of a client-supplied id:

- MVP path: resolve from the `X-User-Id` header.
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
- Fixes the `docs/api.md` drift (documented-but-missing endpoint).
- The web `useCurrentUser()` hook switches from `users/{id}` to `users/me`
  with no other client change.

## Implementation notes

- `UserController#me()` delegating to the existing user lookup service;
  follow Controller → Service → Repository layering and `EntityFinder`.
- Reuse the identity-resolution seam introduced by the account-deletion and
  notification work rather than parsing the header inline.
- Unit tests: happy path, missing header, unknown id.

## Definition of done

`GET /api/users/me` returns the caller's `UserDto`; `docs/api.md` matches the
implementation; Checkstyle/SpotBugs/JaCoCo gates pass.
