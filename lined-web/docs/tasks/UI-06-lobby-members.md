# Task 6 — Lobby Members Tab & Add Member Modal

**Branch:** `feature/ui-06-lobby-members`

*Depends on Task 5 (lobby page frame).*

## Detailed description

1. **Members tab** — "Members · N" header, member cards: avatar, name,
   Owner/Member role badge, @username, joined date; actions per card —
   "That's you" for the current user, "Make owner" / "Remove" for others
   (actions visible to the owner only). A "Pending Invites" section appears
   in the mockup (see backend gap below).
2. **Add Member modal** — opened from the lobby header's "+ Add member":
   search input (username or email) with 🔍 icon, live results list showing
   avatar/name/@username; members already in the lobby show "already in
   lobby ✓"; others get an "Invite" button that adds them immediately. An
   invite-link hint row is shown in the mockup (static for MVP).

## Idea of this task

Membership management is what makes a lobby shared. Search-and-add uses the
existing user search endpoint; adding a member is immediate (no invite
acceptance flow exists in the backend yet).

## Reference to mockup

- File: `mockups/index.html`, screen ids **`lobby-members`** (nav tab
  "Lobby: Members") and **`add-member`** (nav tab "Add Member").
- Serve with `npx serve -p 4321 mockups/`; no deep links yet — see
  [../UI_TASKS.md](../UI_TASKS.md) for how to add them.

## Development steps

1. Build `LobbyMemberList` + `MemberCard` under `src/components/lobby/`.
   Role badge: `Owner` when `user.id === lobby.ownerId`, else `Member`.
   "Joined" date: not in the API — omit or show `user.createdAt` labelled
   "Member since" (document the choice).
> **Update (July 2026):** the backend replaced direct member adds with a
> full invite lifecycle — `POST /api/lobbies/{id}/members` **no longer
> exists**. "Invite" now really invites (pending until accepted). Requires
> Task 15 for the invite API module; the invitee side is Task 17.

2. Add mutations: `useCreateInvite(lobbyId)` (by `userId` or `userEmail`),
   `useResendInvite`, `useCancelInvite`, and `useRemoveMember(lobbyId)`;
   invalidate the lobby and invite queries on success.
3. "Remove" requires a confirm dialog; only rendered when the current user
   is the owner. Removing yourself = leaving (also covered on Lobby
   Settings, Task 13 — share the mutation).
4. Build `AddMemberModal`: debounced search (≥2 chars) via `searchUsers`,
   result rows with three states (already member ✓ / invitable / invite
   pending). "Invite" calls `useCreateInvite`; the row flips to "Invite
   sent"; a 409 means already a member or already invited — surface it.
5. "Make owner": now supported — `PATCH /api/lobbies/{id}` with `ownerId`
   (owner-only; target must already be a member; 409 otherwise). Confirm
   dialog, then invalidate the lobby query; the role badges swap.
6. "Pending Invites" section: real — `GET /api/lobbies/{lobbyId}/invites`
   (owner-only) with **Resend** (`POST …/invites/{id}/resend`) and
   **Cancel** (`DELETE …/invites/{id}`) buttons, matching the mockup.
7. Tests (MSW): members render with correct badges; search filters
   already-members; invite POSTs and appears under Pending Invites;
   duplicate invite shows the 409 message; make-owner PATCHes and swaps
   badges; remove DELETEs after confirm.

## Final / expected result

- `/lobbies/:id?tab=members` lists real members with roles and owner-only
  actions; the owner can add members by search and remove members.
- Modal matches mockup screen `add-member`.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Lobby + memberIds | `GET /api/lobbies/{id}` → `LobbyDto` |
| Member profiles | `GET /api/users/{id}` → `UserDto` |
| Search users | `GET /api/users/search?q=&page=&size=` → `UserPageDto` |
| Create invite | `POST /api/lobbies/{lobbyId}/invites?userId=` or `?userEmail=` (owner-only) → `LobbyInviteDto` |
| Pending invites | `GET /api/lobbies/{lobbyId}/invites` (owner-only) → `LobbyInviteDto[]` |
| Resend / cancel invite | `POST …/invites/{inviteId}/resend`, `DELETE …/invites/{inviteId}` |
| Transfer ownership | `PATCH /api/lobbies/{id}` — body `{ ownerId }` (owner-only) → `LobbyDto` |
| Remove member | `DELETE /api/lobbies/{id}/members/{userId}` → `LobbyDto` |

**Backend gaps (mostly resolved July 2026):** invite flow and ownership
transfer now exist. Remaining: no "joined lobby at" timestamp, no shareable
invite links, and invite emails are not sent (`userEmail` only resolves
existing accounts).
