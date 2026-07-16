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
2. Add mutations: `useAddMember(lobbyId)` and `useRemoveMember(lobbyId)`
   wrapping the existing `addMember`/`removeMember` API functions;
   invalidate the lobby query on success.
3. "Remove" requires a confirm dialog; only rendered when the current user
   is the owner. Removing yourself = leaving (also covered on Lobby
   Settings, Task 13 — share the mutation).
4. Build `AddMemberModal`: debounced search (≥2 chars) via `searchUsers`,
   result rows with three states (already member ✓ / invitable / just added).
   "Invite" calls `useAddMember`; row flips to ✓ optimistically.
5. "Make owner": **no backend endpoint** — hide the button for MVP and note
   the gap (ownership transfer needs a `PATCH /api/lobbies/{id}` API).
6. "Pending Invites" section: **no backend support** — skip rendering for
   MVP; keep the mockup as the target for when invites land.
7. Tests (MSW): members render with correct badges; search shows results and
   filters already-members; invite POSTs and updates the member list;
   remove DELETEs after confirm.

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
| Add member | `POST /api/lobbies/{id}/members?userId={userId}` (header `X-User-Id` must be owner) → `LobbyDto` |
| Remove member | `DELETE /api/lobbies/{id}/members/{userId}` → `LobbyDto` |

**Backend gaps:** no invite/acceptance flow (add is immediate), no ownership
transfer endpoint, no "joined lobby at" timestamp.
