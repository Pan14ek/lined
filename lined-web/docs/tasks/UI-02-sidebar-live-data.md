# Task 2 — Sidebar Live Data

**Branch:** `feature/ui-02-sidebar-live-data`

## Detailed description

`src/components/Sidebar.tsx` currently renders a **hardcoded** lobby list
(`LOBBY_DOTS`) and a hardcoded user footer ("Alex Johnson"). Replace both
with live API data so the shell reflects the signed-in user everywhere.

## Idea of this task

The sidebar is the navigation backbone used by every authenticated screen.
It must show the current user's real lobbies (coloured dot by lobby type)
and the real user identity in the footer, so that all later tasks
(dashboard, lobby pages) have a correct navigation context.

## Reference to mockup

- File: `mockups/index.html` — the left sidebar is identical on screens
  **`dashboard`**, **`calendar`**, **`tasks`**, **`lobby`** (any nav tab
  except Sign In/Sign Up shows it).
- Serve with `npx serve -p 4321 mockups/`. No deep links yet — see
  [../UI_TASKS.md](../UI_TASKS.md) for how to add `#hash` navigation.
- Key mockup details: section labels "NAVIGATE" / "MY LOBBIES", a "+ New"
  affordance next to MY LOBBIES, lobby rows with coloured dots
  (couple=pink, family=orange, friends=purple, work=blue), user footer with
  avatar initial, display name, and email.

## Development steps

1. Add `src/hooks/useCurrentUser.ts` — `useQuery` on
   `getUser(useAuthStore.userId)` (enabled only when signed in).
2. In `Sidebar`, replace `LOBBY_DOTS` with `useMyLobbies()` data. Map
   `lobbyType` → dot colour via a shared helper in `src/lib/constants.ts`
   (e.g. `LOBBY_TYPE_COLOR: Record<LobbyType, string>` with Tailwind token
   classes `bg-lobby-couple` etc.). Reuse this helper in later tasks.
3. Render loading (skeleton rows) and empty ("No lobbies yet — + New") states.
4. Add the "MY LOBBIES  + New" header row; "+ New" opens the Create Lobby
   modal (stub callback until Task 4 lands — wire a Zustand UI store action
   `useCreateMenuStore.openCreateLobby()` now so Task 4 plugs in).
5. Replace the hardcoded user footer with `useCurrentUser()` data: avatar
   initial from username, display name, email. Add a sign-out affordance
   (clears auth store, navigates to `/sign-in`).
6. Tests (MSW): sidebar lists lobbies from `/api/lobbies/mine`, footer shows
   the user from `/api/users/{id}`, empty state renders.

## Final / expected result

- Sidebar shows the real signed-in user's lobbies with correct type colours;
  clicking one navigates to `/lobbies/:id`.
- User footer shows the real username/email; sign-out works.
- No hardcoded persona data remains in `Sidebar.tsx`.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Lobby list | `GET /api/lobbies/mine` (header `X-User-Id`) → `LobbyDto[]` |
| Current user | `GET /api/users/{id}` → `UserDto` |
