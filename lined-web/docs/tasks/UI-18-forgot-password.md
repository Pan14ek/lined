# Task 18 — Forgot Password Flow

**Branch:** `feature/ui-18-forgot-password`

*Depends on Task 1 (auth pages) — reuses `AuthCard`/`AuthField`/`AuthAlert`.
Blocked on a backend gap: no password-reset endpoint exists yet.*

## Detailed description

Task 1 shipped the "Forgot password?" link on the Sign In screen
(`src/pages/SignInPage.tsx`) as static, non-functional text per its task
spec. This task makes it a real flow: request a reset, redeem the token,
set a new password.

## Idea of this task

> **Blocked:** the backend has no self-service password-reset endpoint.
> `POST /api/auth/login` only verifies an existing password and
> `PATCH /api/users/{id}` requires the caller's own `X-User-Id` — there is
> no way for a signed-out, locked-out user to prove identity and set a new
> password. This gap is recorded as `feature/password-reset-flow` (Domain
> "Backend API gap") in `backend/lined/docs/experiment-tasks.md`, with a
> detailed proposal at
> `backend/lined/docs/api-proposals/password-reset-flow.md`. **Do not
> start this task until that endpoint (or an agreed MVP substitute) exists**
> — implementing it against `PATCH /api/users/{id}` today would require the
> old password or a signed-in session, which defeats the purpose of a
> "forgot password" flow.

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
| Request reset | *Not yet implemented* — `POST /api/auth/password-reset-requests`, see `backend/lined/docs/api-proposals/password-reset-flow.md` |
| Redeem token | *Not yet implemented* — `POST /api/auth/password-resets`, see `backend/lined/docs/api-proposals/password-reset-flow.md` |

**Backend gap:** no password-reset endpoints exist. This task cannot start
until they (or an agreed MVP substitute) ship — see the gap entry above for
the proposed shape (reset-request → single-use expiring token → token
redemption sets the new password).
