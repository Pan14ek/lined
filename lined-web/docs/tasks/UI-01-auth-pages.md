# Task 1 — Auth Pages (Sign In / Sign Up)

**Branch:** `feature/ui-01-auth-pages`

## Detailed description

Replace the placeholder Sign In and Sign Up pages with fully working forms
matching the mockup: centred white card on the beige background with the
green accent bar, Lined logo + tagline, form fields, primary green button,
and the cross-link between the two pages.

Historical baseline: this task introduced the auth page forms before the
session client existed. Its persisted identity/header assumptions are
superseded by AUTH-SEC-08.

## Idea of this task

> **Update (July 2026):** the backend now has `POST /api/auth/login` with
> real password verification — the original user-search workaround is
> obsolete. Requires Task 15 (API contract refresh) for the `auth.ts` API
> module and token-aware auth store.

- **Sign Up** = `POST /api/users` with username/email/password, then redirect
  to `/sign-in`; registration does not issue a session.
- **Sign In** = `POST /api/auth/login` with `{ identifier, password }`
  (identifier = email **or** username). On 200, store only the memory-only
  access token and redirect to `/`; on 401 show generic invalid credentials.
- Authenticated requests use the shared Bearer/session client and resolve the
  caller through `GET /api/users/me`.
- Add a route guard: unauthenticated users visiting any `AppShell` route are
  redirected to `/sign-in`; authenticated users visiting auth pages go to `/`.

## Reference to mockup

- File: `mockups/index.html`, screen ids **`signin`** and **`signup`**
  (nav tabs "Sign In" and "Sign Up").
- Open with `npx serve -p 4321 mockups/` → http://localhost:4321, click the
  nav tab. No deep links exist yet — see the note in
  [../UI_TASKS.md](../UI_TASKS.md) describing how to add `#hash` deep links
  to the mockup so this section can link to `http://localhost:4321/#signin`.

## Development steps

1. Extract a shared `AuthCard` wrapper component (`src/components/AuthCard.tsx`):
   beige background with decorative circles, white card, green accent bar,
   logo, tagline, divider — per mockup CSS (`.auth-bg`, `.auth-card`).
2. Build the Sign In form: email, password, "Forgot password?" link
   (non-functional placeholder), submit button, "New to Lined? Create an
   account →" link.
3. Build the Sign Up form: username, email, password, terms note, submit,
   "Already have an account? Sign in →" link.
4. Add the auth mutations. On sign-up success navigate to sign-in; on sign-in
   success store the access token and navigate to `/`.
5. Handle errors: 409 (username/email taken) on sign-up, "user not found" on
   sign-in — inline error text under the relevant field.
6. Add a `RequireAuth` wrapper (or loader) in `src/router.tsx` implementing
   the redirects described above.
7. Tests (MSW): successful sign-up redirects without authenticating; sign-in
   stores the token; unknown credentials show an error; guarded routes wait
   for bootstrap and redirect when unauthenticated.
8. Visual check against mockup screens `signin` / `signup`.

## Final / expected result

- Visiting `/` while signed out redirects to `/sign-in`.
- A new user can sign up, is signed in immediately, and lands on the dashboard.
- An existing user can sign in by email/username and lands on the dashboard.
- Both pages visually match the mockup (480px card, beige bg, green accents).
- Lint, typecheck, tests, and build all pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Sign up | `POST /api/users` — body `UserCreateDto { username, email, password }` → `UserDto` |
| Sign in | `POST /api/auth/login` — body `{ identifier, password }` → token + `userId`/`username`/`email`/`roles`; `401` on bad credentials |
| Load profile after auth | `GET /api/users/me` → `UserDto` |

**Superseded note:** the July 2026 MVP assumptions are retained here as a
historical record. AUTH-SEC-08 now supplies refresh, logout, CSRF-aware
transport, memory-only token state, and current-user bootstrap.
