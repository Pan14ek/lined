# CONTEXT.md — `src/features/auth/`

## Purpose

Sign-in, sign-up, and password reset. Does **not** own the `UserDto` model
or general user CRUD — that's `features/users/`. This feature owns the
*act* of authenticating (issuing/consuming a session), not the user record
itself.

## Structure

```
auth/
  AuthAlert.tsx, AuthCard.tsx    shared shell/error-banner used by all auth pages
  RequireAuth.tsx                route guards: <RequireAuth/> (redirect if signed out),
                                  <RedirectIfAuthed/> (redirect if already signed in)
  model/index.ts                 LoginRequestDto, LoginResponseDto,
                                  PasswordResetRequestDto, PasswordResetDto
  api/                           prod.ts + dev.ts + index.ts + handlers.ts
  hooks/useAuth.ts                useSignIn, useSignUp, useRequestPasswordReset, useResetPassword
  pages/                          SignInPage, SignUpPage, ForgotPasswordPage, ResetPasswordPage
```

## API surface

`prod.ts` calls: `POST auth/login`, `POST auth/password-reset-requests`,
`POST auth/password-resets`. Auth MVP identifies the caller via an
`X-User-Id` header set post-login by the auth store — there is no token
refresh flow yet (see Known gaps).

`useSignUp` actually calls `createUser` from **`features/users/api`** (sign-up
creates a `UserDto`), not this feature's own `api/`. That's the one
intentional cross-feature call inside `hooks/useAuth.ts`.

## Depends on

- `features/users/api` — `createUser` (sign-up)

## Depended on by

- `src/router.tsx` — `RequireAuth`/`RedirectIfAuthed` gate every route
- `features/calendar/events/{CreateEventModal,ReserveSlotModal}.tsx` — reuse
  `AuthAlert` as a generic inline error banner (not literally an auth
  concern, just a convenient shared alert shape that happened to be built
  here first)

## Testing

Each file has a colocated `__tests__/`. `useAuth` tests exercise
`useSignIn`/`useSignUp` against the MSW handlers in `api/handlers.ts`. See
`docs/TESTING.md` at the repo root for conventions.

## Known gaps

- No refresh-token / session-expiry handling — `X-User-Id` is trusted as
  long as the auth store holds it (see root `AGENTS.md`, "API Authentication
  (MVP)").
- Password reset validates a hardcoded `'valid-token'` in `dev.ts`/MSW mocks
  — there's no real token issuance to mock against yet.
