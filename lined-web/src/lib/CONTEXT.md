# CONTEXT.md — `src/lib/`

## Purpose

Cross-feature infrastructure: the HTTP client every feature's `api/prod.ts`
is built on, generic error handling, and the Tailwind class-merge helper.
Every feature's own formatters/constants (`calendarUtils`, `taskUtils`,
`subscriptionUtils`, each feature's `lib/constants.ts`) live in that
feature's `lib/` folder instead — see `docs/ARCHITECTURE.md`.

## Structure

```
lib/
  apiClient.ts    the shared `ky` instance (Bearer/session transport, CSRF,
                  refresh coordinator), USE_MOCKS flag, MockHttpError,
                  getErrorStatus, mockDelay, toSearchParams, requestVoid
  apiErrors.ts    getApiErrorMessage(error, statusMessages, fallback) —
                  maps an HTTP status to a user-facing string
  utils.ts        cn() — clsx + tailwind-merge, used by every component
                  including components/ui/*
```

## Key exports, in detail

- **`api`** (in `apiClient.ts`) — the one `ky` instance in the app. Every
  feature's `prod.ts` imports `api`/`requestVoid`/`toSearchParams` from
  here; it includes cookies, injects the volatile Bearer token, and coordinates
  CSRF-aware single-flight refreshes.
- **`USE_MOCKS`** — `import.meta.env.VITE_USE_MOCKS === 'true'`. Read by
  every feature's `api/index.ts` to choose `dev.ts` vs `prod.ts`.
- **`MockHttpError` / `getErrorStatus`** — `dev.ts` mocks throw
  `MockHttpError(status, message)` instead of a real `ky` `HTTPError`.
  `getErrorStatus(error)` recognizes both, so error-status checks
  (`getErrorStatus(error) === 404`) work identically whether the app is
  hitting a real backend, MSW, or `dev.ts`. **Never** write a bare
  `error instanceof HTTPError` check outside this file — it'll silently
  break in mock mode.
- **`getApiErrorMessage`** — used at call sites to turn a status code into
  copy, e.g. `getApiErrorMessage(error, { 409: 'Already exists' }, 'Try again')`.
- **`initializeCsrf`**, **`refreshAccessToken`**, and **`logoutSession`** —
  session operations used by bootstrap and sign-out; refresh is single-flight
  and protected requests retry at most once.

## Depends on

`ky` (npm package), `src/store/auth.ts` (for the volatile access token).

## Depended on by

Every feature's `api/prod.ts`; `apiErrors.ts` is used at UI call sites
across most features; `cn()` is used by nearly every component in the app,
including the shadcn primitives in `components/ui/`.

## Testing

`apiClient.test.ts` and `apiErrors.test.ts` cover the error-status/message
helpers directly (no network). `utils.test.ts` covers `cn()`. See root
`docs/TESTING.md`.

## Known gaps

None — this is stable infrastructure. Changes here are high-blast-radius;
run the full suite after touching anything here, not just this folder's
tests.
