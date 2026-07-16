# Task 17 — Lobby Invites (Invitee Side)

**Branch:** `feature/ui-17-lobby-invites-inbox`

*Depends on Task 15 (API contract refresh). Complements Task 6, whose
owner-side flow now uses invites instead of direct member adds.*

## Detailed description

The backend replaced direct member adds with an invite lifecycle; Task 6
covers the **owner** side (send/resend/cancel, pending list). This task adds
the **invitee** side, which no mockup screen anticipated:

1. **Pending invites surface** — on the dashboard (a banner/card above "My
   Lobbies") and/or in the notifications inbox (Task 16): "{inviter} invited
   you to {lobby}" with **Accept** / **Decline** buttons, from
   `GET /api/lobby-invites/mine`.
2. **Accept** → `POST /api/lobby-invites/{inviteId}/accept`: the lobby
   appears in the sidebar immediately (invalidate `lobbies/mine`), navigate
   to it.
3. **Decline** → `POST /api/lobby-invites/{inviteId}/decline` after a light
   confirm; the card disappears.
4. Handle the terminal-state race: accepting an already-cancelled invite
   returns 409 — show "This invite is no longer valid" and refresh the list.

## Idea of this task

Consent is the point of the invite flow — without an invitee UI, invited
users can never actually join a lobby. This is the missing half of
membership.

## Reference to mockup

- **No mockup screen exists for the invitee side.** The owner-side pending
  list is on screen id **`lobby-members`** (`mockups/index.html`) — reuse
  its card style for the invitee banner. Recommended: add an
  `invites-inbox` screen (or extend the `dashboard` screen with an invite
  banner) to `mockups/index.html` for parity.

## Development steps

1. Hooks in `src/hooks/useInvites.ts`: `useMyInvites()` (poll or refetch on
   window focus), `useAcceptInvite()`, `useDeclineInvite()` — invalidating
   both `invites/mine` and `lobbies/mine` on accept.
2. Build `PendingInvitesBanner` (`src/components/PendingInvitesBanner.tsx`)
   rendered on the dashboard when `myInvites` is non-empty; resolve inviter
   and lobby names via existing `useUsers`/`useLobby` patterns (note: the
   invitee may not be able to `GET /api/lobbies/{id}` before joining — fall
   back to "a lobby" or extend the invite DTO display data; document the
   choice).
3. Wire accept/decline with optimistic removal + rollback; 409 handling per
   above.
4. If Task 16 is done, also render invites as inbox entries with the same
   actions.
5. Tests (MSW): banner renders pending invites; accept adds the lobby to the
   sidebar list and navigates; decline removes the card; 409 shows the
   stale-invite message.

## Final / expected result

- An invited user sees their pending invites on the dashboard, can accept
  (and lands in the lobby) or decline, with correct handling of stale
  invites.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| My pending invites | `GET /api/lobby-invites/mine` → `LobbyInviteDto[]` |
| Accept | `POST /api/lobby-invites/{inviteId}/accept` |
| Decline | `POST /api/lobby-invites/{inviteId}/decline` |
| Refresh lobbies | `GET /api/lobbies/mine` |

**Backend gap:** invite creation supports `userEmail` resolution to existing
accounts only — no email is sent and there are no shareable invite links;
the mockup's "invite link" hint stays static (see
`backend/lined/docs/api.md`, Lobby Invites).
