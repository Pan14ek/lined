# Task 46 — Archived Lobbies Section + Restore

**Branch:** `feature/ui-46-archived-lobbies-section`

*Depends on Task 45 (read-only UX shares the badges). Backend BE-03
(`?lifecycleStatus=ARCHIVED` query + `restore` endpoint), BE-12
(archive job flips lifecycle after 30 days).*

## Detailed description

Give owners a way to see, use (read-only), and restore lobbies that
were archived after downgrade. Archived lobbies stay out of the main
sidebar/dashboard until restored.

- **New "Archived" section in sidebar** — collapsed by default, shows
  a count "Archived (N)". Expanding lists archived lobbies with a
  read-only icon + last-active date.
- **Archived list page** — `/lobbies/archived` route showing an
  `ArchivedLobbyCard` per row: name, type accent, member count,
  archived date, and actions:
  - **View** — deep-links into the lobby detail page (which will
    display the read-only ribbon from Task 45).
  - **Restore** — visible only for the owner and only when the
    owner's effective plan is PRO and adding this lobby wouldn't
    exceed `LOBBIES_MAX`. Calls
    `POST /api/lobbies/{id}/restore`. Success: toast "Lobby restored";
    invalidate `myLobbies` + archived-list.
  - **Leave** — visible to non-owner members; existing leave endpoint.
  - **Delete** — visible to owner; existing delete endpoint (survives
    read-only via reduction whitelist).
- **Errors** — 409 `LOBBY_LIMIT_EXCEEDED` on restore → inline "You've
  reached your Pro lobby limit. Delete or archive another lobby
  first."; 403 when caller is not owner.
- **Empty state** — reuse `EmptyState` primitive (Task 21) with
  friendly copy: "No archived lobbies. Lobbies land here 30 days after
  a downgrade if you don't select them as your Free lobby."

## Idea of this task

Archive is the design's data-preservation guarantee — but only if
users can actually find and act on archived lobbies. Making them
discoverable in the sidebar + a dedicated route (not a scrollable
buried section) turns the promise into something users can rely on.

## Reference to mockup

- No mockup exists — mirror the existing dashboard `LobbyCardGrid`
  layout. Sketch in PR description.

## Development steps

1. **MSW first.** Extend `src/features/lobby/api/handlers.ts`:
   - GET `/api/lobbies?lifecycleStatus=ARCHIVED` → filtered mock
     lobby list
   - POST `/api/lobbies/{id}/restore` → flips lifecycle back;
     409 when mock hits capacity
   - `dev.ts` + `prod.ts`: `getArchivedLobbies()`, `restoreLobby(id)`
2. **Hooks.**
   - `useArchivedLobbies()` — `useQuery` keyed
     `['lobbies','archived']`.
   - `useRestoreLobby()` — mutation invalidating both keys.
3. **Components.**
   - `ArchivedSection.tsx` — the sidebar accordion.
   - `ArchivedLobbyCard.tsx` — the list card with actions.
   - `ArchivedLobbiesPage.tsx` — the `/lobbies/archived` page.
4. **Route.** Add `/lobbies/archived` under `<RequireAuth />` in
   `src/router.tsx`.
5. **Nav.** Sidebar shows the "Archived (N)" entry beneath "My
   Lobbies"; link points to `/lobbies/archived`.
6. **Tests.**
   - `ArchivedLobbiesPage.test.tsx` — renders list; owner sees
     Restore; non-owner sees Leave.
   - `useRestoreLobby.test.tsx` — success invalidates both keys;
     409 shows inline error.
   - `ArchivedSection.test.tsx` — count reflects mock; collapsed by
     default; expands on click.

## Final / expected result

- Sidebar surfaces an Archived section with count; clicking navigates
  to `/lobbies/archived`.
- Archived list shows all archived lobbies; owners can restore (with
  capacity gate); everyone else sees appropriate actions.
- Restoring a lobby moves it back into `GET /api/lobbies/mine` and
  removes it from the archived list.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| List archived | `GET /api/lobbies?lifecycleStatus=ARCHIVED` |
| Restore | `POST /api/lobbies/{lobbyId}/restore` |
| Active lobbies | `GET /api/lobbies/mine` |

**Backend gap:** none once BE-03 ships the query + restore endpoint.
