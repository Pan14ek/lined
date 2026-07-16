# Task 12 — User Settings Page

**Branch:** `feature/ui-12-user-settings`

## Detailed description

Replace the `UserSettingsPage` stub with the mockup's two-pane settings
layout:

- **Left menu** (220px): ACCOUNT (Profile, Password & Security,
  Notifications), PREFERENCES (Appearance, Language & Region), DANGER
  (Delete Account, red). Active item gets a green left border.
- **Profile card**: large avatar + "Change photo" (placeholder), editable
  display name, username, email rows, "Save changes".
- **Notifications card**: five toggles (new shared events, task assigned,
  free slot detected, event reminders, email digests).
- **Appearance card**: theme select (Light / Dark / System).
- **Danger Zone card**: red-bordered "Delete my account".

## Idea of this task

Standard account self-service. Profile editing maps directly to
`PATCH /api/users/{id}`; the rest of the sections have no backend yet and are
persisted client-side (documented) so the UI is complete and swappable later.

## Reference to mockup

- File: `mockups/index.html`, screen id **`user-settings`** (nav tab
  "User Settings").
- Serve with `npx serve -p 4321 mockups/`; no deep links yet — see
  [../UI_TASKS.md](../UI_TASKS.md) for how to add them.

## Development steps

1. Build the layout: `SettingsMenu` (left) + scrollable content. The menu
   scrolls/filters to sections (single page with anchors is fine for MVP —
   match the mockup's one-scroll content).
2. Profile card: form pre-filled from `useCurrentUser()`; dirty-state
   tracking; save via new `useUpdateUser()` mutation
   (`PATCH /api/users/{id}` with only changed fields); handle 409
   username/email conflicts inline. Note: the API has `username` and `email`
   but **no separate display name** — render one "Username" row (or map
   display name → username) and document it.
3. Password & Security: change-password form calling
   `PATCH /api/users/{id} { password }` (current-password check impossible —
   note as backend gap).
4. Notifications card: toggles stored in a persisted Zustand
   `useSettingsStore` (`// client-only until backend notification prefs
   exist`).
5. Appearance: theme select in the same store; apply `dark` class on the
   root element (Tailwind dark mode) — System follows
   `prefers-color-scheme`. (If dark palette is out of scope, ship the
   control storing the preference and follow up.)
6. Danger Zone: **no `DELETE /api/users/{id}` endpoint** — render the card
   with the button disabled + tooltip "Coming soon", flag backend follow-up.
7. Tests (MSW): profile save PATCHes changed fields only; conflict shows
   error; toggles persist across reload (persisted store).

## Final / expected result

- `/settings` renders the full two-pane settings page; profile edits persist
  to the backend; preference toggles persist locally.
- Visual match with mockup screen `user-settings`.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Load profile | `GET /api/users/{id}` → `UserDto` |
| Update profile / password | `PATCH /api/users/{id}` — `UserUpdateDto { username?, email?, password? }` → `UserDto` |

**Backend gaps (updated July 2026):**
- **Resolved:** `DELETE /api/users/{id}` exists (self-service; 409 when the
  account still owns lobbies — surface "transfer or delete your lobbies
  first") — implement the Danger Zone button for real (step 6 obsolete).
  Notification preferences have a real API — step 4's client-only store is
  superseded by Task 16 (`GET/PATCH /api/notifications/preferences`).
- **Still missing:** avatar upload, display-name field, current-password
  verification on change, `GET /api/users/me` (keep `users/{id}` until the
  proposal in `backend/lined/docs/api-proposals/users-me-endpoint.md` lands).
