# Task 18 — Forgot Password Flow

**Branch:** `feature/ui-18-forgot-password`

*Depends on Task 1 (auth pages) — reuses `AuthCard`/`AuthField`/`AuthAlert`.
The password-reset endpoints are now available; the original blocked status
is superseded.*

## Detailed description

Task 1 shipped the "Forgot password?" link on the Sign In screen
(`src/pages/SignInPage.tsx`) as static, non-functional text per its task
spec. This task makes it a real flow: request a reset, redeem the token,
set a new password.

## Idea of this task

> **Historical MVP note:** this task was originally blocked on a missing
> self-service password-reset endpoint. The backend now provides
> `POST /api/auth/password-reset-requests` and
> `POST /api/auth/password-resets`; the old blocker and identity workaround
> are superseded.

- **Request step** — a new `/forgot-password` route: email or username
  input, submit calls the reset-request endpoint. Always show a neutral
  success message ("If an account exists for that email, we've sent a
  reset link") regardless of whether the identifier matched, to avoid
  leaking account existence.
- **Redemption step** — a new `/reset-password?token=...` route: new
  password + confirm-password fields (reuse the `AuthField` validation
  pattern from `SignUpPage.tsx` — required, min length 8, must match),
  submit calls the token-redemption endpoint. On success, redirect to
  `/sign-in` with a success banner; on an expired/invalid token, show an
  `AuthAlert` with a link back to `/forgot-password`.
- Wire the "Forgot password?" link on `SignInPage.tsx` to
  `<Link to="/forgot-password">`.

## Reference to mockup

No screen exists yet for this flow in `mockups/index.html`. Reuse the
`AuthCard` shell (beige background, 480px white card, green accent bar)
built in Task 1 (`src/components/AuthCard.tsx`) for visual consistency —
there is no separate mockup screen to match pixel-for-pixel.

## Development steps

1. Confirm the backend endpoints exist and read their exact request/response
   shapes in `backend/lined/docs/api.md` before writing the API client —
   do not guess the contract.
2. `src/api/auth.ts`: add `requestPasswordReset(identifier)` and
   `resetPassword(token, newPassword)`.
3. `src/hooks/useAuth.ts`: add `useRequestPasswordReset()` and
   `useResetPassword()` mutations.
4. `src/pages/ForgotPasswordPage.tsx` (new) — identifier field, submit,
   neutral success state (reuse `AuthCard`/`AuthField`).
5. `src/pages/ResetPasswordPage.tsx` (new) — reads `token` from the query
   string via `useSearchParams`; new-password + confirm-password fields
   with the same validation pattern as `SignUpPage.tsx`; missing/invalid
   token shown as an `AuthAlert` before the form renders.
6. Register both routes in `src/router.tsx`, wrapped in `RedirectIfAuthed`
   like `/sign-in` and `/sign-up`.
7. Update `SignInPage.tsx`'s "Forgot password?" text to a real `Link`.
8. MSW handlers in `src/test/handlers/auth.ts`: request step always returns
   `202` regardless of whether the identifier matches (no distinguishable
   response); redemption returns `204` on success, `400` for an invalid or
   expired token.
9. Tests: request-step shows the neutral success message for both known and
   unknown identifiers; redemption-step validates and blocks on mismatched
   passwords (same assertions as the existing `SignUpPage.test.tsx` mismatch
   test); expired-token banner renders and links back to the request step.

## Final / expected result

- A signed-out user can request a reset from `/forgot-password`, follow the
  (out-of-band-delivered) link to `/reset-password?token=...`, set a new
  password, and sign in with it.
- Invalid/expired tokens show a clear error with a way back to request a
  new one.
- Lint, typecheck, tests, and build all pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Request reset | `POST /api/auth/password-reset-requests` |
| Redeem token | `POST /api/auth/password-resets` |

**Superseded backend-gap note:** the endpoints now exist. The remaining mock
limitation is that dev/MSW uses a fixed test token rather than issuing a real
out-of-band reset credential.

## Progress note (historical mock-only MVP)

The original UI implementation shipped against MSW while the backend gap was
open. It remains as a historical record; the current client calls the same
backend endpoints through the shared Bearer/session transport.
