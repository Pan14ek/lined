# API Proposal — Password Reset Flow

**Branch:** `feature/password-reset-flow`
**Status:** Proposed
**Motivation:** UI gap (flagged by
[UI task 18](../../../../../../lined-web/docs/tasks/UI-18-forgot-password.md)). The Sign In screen's
"Forgot password?" link ships as a non-functional placeholder because there
is no self-service recovery path. `POST /api/auth/login` only verifies an
existing password, while account-scoped changes require a validated Bearer
session; a locked-out user has no session to prove identity with.

## What the API should do

A two-step, token-based reset — request, then redeem — so a signed-out user
never needs an existing session or password to regain access:

```
POST /api/auth/password-reset-requests
Body: { "identifier": "alex@example.com" }   (email or username)
→ 202 Accepted, empty body

POST /api/auth/password-resets
Body: { "token": "<opaque-token>", "newPassword": "N3wP@ss!" }
→ 204 No Content
```

- **Request step always returns `202`**, whether or not the identifier
  matches an account, and never reveals which. This prevents account
  enumeration — the same shape `AuthController#login` already guards
  against with its generic 401 message.
- If the identifier matches an account, generate a single-use, random,
  high-entropy token (e.g. `SecureRandom` + Base64URL, not the JWT/Bearer
  token used by `POST /api/auth/login` — this is a one-time credential, not
  a session), persist a hash of it (never the raw token) with an expiry
  (15–30 minutes) and the target user id, and deliver it out-of-band
  (matches the existing "no external email/push delivery yet" gap — see
  `docs/research/experiment/experiment-tasks.md`'s `feature/notification-preferences` row; until
  real delivery exists, log the token server-side for manual/dev use, the
  same MVP shortcut already used for notification delivery intents).
- **Redemption step:**
  - `404`/`410`-equivalent generic `400 Bad Request` with
    `{ "title": "Bad Request", "detail": "Invalid or expired reset token" }`
    for an unknown, expired, or already-used token (don't distinguish which,
    same enumeration-avoidance reasoning as the request step).
  - On success: hash and persist `newPassword` on the target user, mark the
    token used (or delete it) so it cannot be redeemed twice, and invalidate
    any other outstanding reset tokens for that user.
  - Validation on `newPassword`: reuse whatever constraint
    `UserCreateDto`/`UserUpdateDto` already apply to `password` (see
    `io.backend.lined.user.api.UserCreateDto`) so reset and signup enforce
    the same policy.

## Why it matters

- Closes the last placeholder left by Task 1 (`UI-01-auth-pages`) — the
  "Forgot password?" link currently does nothing.
- Establishes the token-hash-and-expire pattern this codebase will likely
  reuse for lobby invite tokens (`feature/lobby-invites`, already
  implemented) and any future email-verification flow.

## Implementation notes

- New `auth` module addition: `PasswordResetTokenEntity` (user FK LAZY,
  `tokenHash`, `expiresAt` as `OffsetDateTime` UTC, `usedAt` nullable),
  repository, `PasswordResetService` behind `AuthController`'s existing
  `RequestMapping("/api/auth")`. Keep `AuthController` a thin delegator like
  its current `login()` method.
- Reuse whatever password hashing `UserServiceImpl`/`AuthService` already
  use for `UserEntity.password` (Spring Security `PasswordEncoder`) — do not
  introduce a second hashing scheme for the reset token; hash the token with
  a fast, keyed hash (e.g. SHA-256) since it's single-use and short-lived,
  distinct from the slow password hash.
- Token lookup must be constant-time / not leak existence via timing —
  standard `PasswordEncoder.matches`-style comparison, not a raw equality
  short-circuit.
- Layering: Controller → Service → Repository, `EntityFinder.findOrThrow`
  for the token lookup, `ConflictException`/`NotFoundException` semantics
  are *not* appropriate here — both failure modes should collapse to the
  same generic `400`, so implement that check inside the service rather than
  letting a `NotFoundException` (404) leak through, which would distinguish
  "no such token" from "expired token" via status code.
- Unit tests: valid request for known/unknown identifier both return `202`
  with no observable difference; valid token redemption updates the
  password and invalidates the token; expired token rejected; reused
  (already-redeemed) token rejected; redeeming invalidates other
  outstanding tokens for the same user.

## Definition of done

`POST /api/auth/password-reset-requests` and `POST /api/auth/password-resets`
exist, documented in `docs/foundation/api.md`; a user can recover access without an
existing session; Checkstyle/SpotBugs/JaCoCo gates pass; `UI-18-forgot-password.md`
is unblocked.
