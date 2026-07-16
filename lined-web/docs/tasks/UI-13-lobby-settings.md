# Task 13 — Lobby Settings Page

**Branch:** `feature/ui-13-lobby-settings`

*Depends on Tasks 5 (lobby header) and 4 (`LobbyTypePicker`).*

## Detailed description

Replace the `LobbySettingsPage` stub with the mockup screen:

- Reuses the **lobby header** (avatar, name, members, type badge) from
  Task 5, with a "← Back to lobby · Lobby Settings" breadcrumb (no tab bar).
- **General card**: lobby name input + the 2×2 `LobbyTypePicker` (Task 4),
  "Save changes".
- **Lobby Notifications card**: three per-lobby toggles (new events, task
  updates, free-slot notifications).
- **Danger Zone card**: "Leave lobby" (outline red) and "Delete lobby"
  (filled red, owner only).

## Idea of this task

Per-lobby administration: rename/retype the space, tune its noise level,
and the exits (leave/delete). Completes the lobby feature set.

## Reference to mockup

- File: `mockups/index.html`, screen id **`lobby-settings`** (nav tab
  "Lobby Settings").
- Serve with `npx serve -p 4321 mockups/`; no deep links yet — see
  [../UI_TASKS.md](../UI_TASKS.md) for how to add them.

## Development steps

1. Route already exists (`/lobbies/:id/settings`). Compose: `LobbyHeader`
   (Task 5), breadcrumb, settings cards (reuse card styles from Task 12 —
   extract a shared `SettingsCard` component).
2. General card: **now fully supported** — `PATCH /api/lobbies/{id}` with
   `{ name?, lobbyType? }` (owner-only; requires Task 15). Wire the name
   input and type picker with dirty-state tracking and "Save changes";
   non-owners see the card read-only. Handle 403 (not owner).
3. Notifications card: use the real per-lobby API —
   `GET/PATCH /api/lobbies/{lobbyId}/notification-preferences` (member-only,
   partial PATCH). Superseded detail in Task 16; if Task 16 already rewired
   these toggles, just compose its hooks here.
4. Leave lobby: `DELETE /api/lobbies/{id}/members/{myUserId}` after a
   confirm dialog; on success invalidate lobbies and navigate to `/`.
   The owner cannot leave (backend forbids removing the owner — surface the
   409/`ConflictException` message: transfer ownership first / delete
   instead).
5. Delete lobby: owner only (`lobby.ownerId === currentUserId`); confirm
   dialog requiring the lobby name typed; `DELETE /api/lobbies/{id}`;
   navigate to `/` and invalidate lobbies.
6. Tests (MSW): non-owner sees Leave but not Delete; leave DELETEs
   membership and redirects; delete requires confirmation and removes the
   lobby from the sidebar; owner-leave shows the conflict message.

## Final / expected result

- `/lobbies/:id/settings` matches the mockup; leave/delete work end-to-end
  with confirmations and correct permission gating; general section is
  present (read-only until the backend update endpoint exists).
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Load lobby | `GET /api/lobbies/{id}` → `LobbyDto` |
| Update lobby | `PATCH /api/lobbies/{id}` — `{ name?, lobbyType?, ownerId? }` (owner-only) → `LobbyDto` |
| Per-lobby notification prefs | `GET/PATCH /api/lobbies/{lobbyId}/notification-preferences` |
| Leave lobby | `DELETE /api/lobbies/{id}/members/{userId}` (self) → `LobbyDto` |
| Delete lobby | `DELETE /api/lobbies/{id}` (owner only) |

**Backend gaps (resolved July 2026):** lobby update and per-lobby
notification preferences both exist now — the General card is editable and
the toggles persist server-side (see Tasks 15/16).
