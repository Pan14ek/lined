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
  AuthBootstrap.tsx              CSRF, refresh, and current-user startup gate
  sessionCleanup.ts              logout/account-delete cache isolation
  RequireAuth.tsx                route guards: <RequireAuth/> (redirect if signed out),
                                  <RedirectIfAuthed/> (redirect if already signed in)
  model/index.ts                 LoginRequestDto, LoginResponseDto,
                                  PasswordResetRequestDto, PasswordResetDto
  api/                           prod.ts + dev.ts + index.ts + handlers.ts
  hooks/useAuth.ts                useSignIn, useSignUp, useRequestPasswordReset, useResetPassword
  pages/                          SignInPage, SignUpPage, ForgotPasswordPage, ResetPasswordPage
```

## API surface

`prod.ts` calls `POST auth/login`, `POST auth/refresh`, `POST auth/logout`,
`GET auth/csrf`, and the password-reset endpoints. The access token is held
only in memory by the auth store; the refresh capability remains in the
HttpOnly cookie. `GET users/me` is owned by `features/users/` and is the
current-user source after bootstrap.

`useSignUp` actually calls `createUser` from **`features/users/api`** (sign-up
creates a `UserDto`), not this feature's own `api/`. `AuthBootstrap` also
loads `getCurrentUser` from that API after session refresh. That's the one
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

## Session behavior

- `AuthBootstrap` starts in `bootstrapping`, attempts CSRF initialization and
  refresh, then exposes the application only as authenticated or
  unauthenticated.
- The shared client performs one single-flight refresh for concurrent 401s and
  retries each original request once. Login, refresh, logout, CSRF, and
  password-reset routes are excluded from refresh recursion.
- Password-reset dev/MSW handlers use deterministic mock responses because
  delivery of reset material is outside the web client; production requests
  still use the backend's signed-out, single-use reset-token contract.
