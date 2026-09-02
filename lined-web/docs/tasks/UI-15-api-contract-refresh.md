# Task 15 — API Contract Refresh (July 2026 backend)

**Branch:** `feature/ui-15-api-contract-refresh`

*Do this first — every other task builds on the API layer it fixes. No
visual changes; this is `src/api/`, `src/types/`, hooks, and MSW handlers
only.*

## Detailed description

The backend closed all nine gaps this plan originally flagged
(`backend/lined/docs/api.md` is the reference). The web API layer was
written against the old contract and is now partially wrong. Bring
`src/types/index.ts`, `src/api/*`, and `src/test/handlers/*` up to date.

## Idea of this task

One focused migration PR so the contract changes land atomically, instead of
each feature task discovering a mismatch mid-implementation.

## Reference to mockup

Not applicable — no UI change. The contract reference is
`backend/lined/docs/api.md` and Swagger UI (`http://localhost:8080/swagger-ui`).

## Development steps

1. **Breaking — lobby members:** `POST /api/lobbies/{id}/members` no longer
   exists. Remove `addMember()` from `src/api/lobbies.ts`; add
   `src/api/invites.ts`: `createInvite(lobbyId, { userId | userEmail })`,
   `listLobbyInvites(lobbyId)`, `resendInvite`, `cancelInvite`,
   `myInvites()`, `acceptInvite(id)`, `declineInvite(id)` + a
   `LobbyInviteDto` type (`{ id, lobbyId, inviterId, inviteeId, status,
   sentAt, createdAt, updatedAt }`).
2. **Auth:** add the auth API for `login({ identifier, password })`,
   refresh, logout, and CSRF initialization. Keep the access token in memory;
   load identity separately through `GET /api/users/me` and do not persist or
   synthesize a caller id in the client.
3. **Tasks:** extend `TaskDto`/`TaskCreateDto`/`TaskUpdateDto` with
   `description`, `priority` (`'HIGH' | 'MEDIUM' | 'LOW'`), `status` on
   create, `notifyAssignee`; add `listMyTasks()` → `GET /api/tasks/mine`.
4. **Events:** extend `EventDto`/`EventCreateDto`/`EventUpdateDto` with
   `location` (nullable; empty string clears on update) and `notifyMembers`
   on create.
5. **Lobbies:** add `updateLobby(id, { name?, lobbyType?, ownerId? })` →
   `PATCH /api/lobbies/{id}`; add `getFreeSlots(lobbyId, from, to)` →
   `GET /api/lobbies/{id}/free-slots` (`FreeSlotDto { start, end }[]`).
6. **Notifications:** add `src/api/notifications.ts`: global prefs get/patch,
   per-lobby prefs get/patch, `myNotifications()`, `markRead(id)` + DTO types
   per `api.md`.
7. **Users:** add `deleteUser(id)` → `DELETE /api/users/{id}` (409 = owns
   lobbies).
8. **MSW:** update every handler in `src/test/handlers/` to the new shapes;
   add handlers for auth, invites, notifications, free-slots. Remove the
   old `POST /lobbies/:id/members` handler.
9. Add all new query keys to `QUERY_KEYS` in `src/lib/constants.ts`.
10. Run the full suite — existing tests referencing removed/changed
    functions must be updated, not deleted.

## Final / expected result

- `src/api/` + `src/types/` mirror `backend/lined/docs/api.md` exactly; no
  function targets a removed endpoint.
- MSW handlers cover the full new surface, so tasks 1–14 and 16–17 mock
  against the real contract.
- Lint, typecheck, tests, build pass.

## REST API used

The full current surface — see the Backend API summary table in
[`../UI_TASKS.md`](../UI_TASKS.md) and `backend/lined/docs/api.md`.

**Historical note:** the original contract-refresh plan predated
`GET /api/users/me` and AUTH-SEC-08. Current web authentication uses the
Bearer/session contract; remaining gaps are external email/push delivery,
avatar upload, and display-name field.
