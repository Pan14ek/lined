# CONTEXT.md — `src/features/lobby/`

## Purpose

The core grouping concept in the app: a lobby (couple/family/friends/work)
is a shared space with members, tasks, events, and settings. This is the
biggest feature and also owns **lobby invites** — invites are a lobby
membership concern, not a `notifications` concern, even though they surface
in the notification bell.

## Structure

```
lobby/
  CreateLobbyModal.tsx    global "create a new lobby" overlay (mounted by layout/AppShell)
  model/index.ts          LobbyType, LobbyDto, LobbyCreateDto, LobbyUpdateDto,
                          FreeSlotDto, LobbyInviteStatus, LobbyInviteDto
  api/                    prod.ts + dev.ts + index.ts + mockData.ts + handlers.ts
                          — covers BOTH /lobbies/* and /lobby-invites/* endpoints
  lib/constants.ts        LOBBY_TYPE_* label/color/icon/tagline maps,
                          lobbyAccentColor(), QUERY_KEYS (lobbies + invites)
  lib/cache.ts            removeLobbyScopedQueries(queryClient, lobbyId) —
                          purges lobby detail + every lobby-scoped dependent
                          cache (tasks, free-slots, invites, notification
                          prefs, calendar/conflicts)
  hooks/
    useLobbies.ts          useMyLobbies, useLobby, useCreateLobby, useUpdateLobby,
                          useDeleteLobby, useUpdateLobbyOwner, useRemoveMember
    useInvites.ts          useLobbyInvites, useCreateInvite, useResendInvite,
                          useCancelInvite, useMyInvites, useAcceptInvite, useDeclineInvite
  header/                 LobbyHeader, LobbyTabBar, LobbyLoadStates
  members/                LobbyMemberList, MemberListContent, MemberCard,
                          PendingInvitesSection, PendingInviteRow, AddMemberModal,
                          SearchResultsList, SearchResultRow, AssigneePicker
  calendar/               LobbyCalendarView, DayAgendaModal (embeds features/calendar)
  settings/               LobbyGeneralCard, LobbyDangerZoneCard,
                          LobbyNotificationsCard, LobbyTypePicker
  tasks/                  LobbyTaskList, TaskRow (lobby-scoped task list)
  pages/                  LobbyPage (tabs: calendar/tasks/members),
                          LobbySettingsPage
```

## API surface

`prod.ts`: `GET lobbies/mine`, `GET/PATCH/DELETE lobbies/{id}`,
`POST lobbies`, `GET lobbies/{id}/free-slots`,
`DELETE lobbies/{lobbyId}/members/{userId}`; plus invites:
`POST/GET lobbies/{lobbyId}/invites`,
`POST lobbies/{lobbyId}/invites/{inviteId}/resend`,
`DELETE lobbies/{lobbyId}/invites/{inviteId}`, `GET lobby-invites/mine`,
`POST lobby-invites/{inviteId}/accept`, `POST lobby-invites/{inviteId}/decline`.

## Depends on

- `features/calendar/{CalendarTopBar,events/CreateEventModal,panels/EventDetailPanel,grid/WeekGrid,grid/WeekEmptyBanner}`
  — `LobbyCalendarView` embeds the calendar feature rather than reimplementing it
- `features/users/hooks` — member profile lookups (`useUsers`, `useUser`,
  `useUserSearch`, `useCurrentUser`)
- `features/tasks/lib` — task-status/priority formatting in `LobbyTaskList`/`TaskRow`
- `features/notifications/lib` — `useLobbyNotificationPreferences` in
  `LobbyNotificationsCard`
- `features/settings/SettingsCard` — shared card shell for the Lobby
  Settings page cards
- `features/auth/AuthAlert`, `hooks/useRowMutationState` (shared, not
  feature-owned) — generic error/row-busy-state UI in members/invites flows

## Depended on by

- `features/dashboard` — `getFreeSlots`, `QUERY_KEYS`, `useMyLobbies`
- `features/notifications` — `NotificationBell`/`PendingInvitesBanner` call
  `useMyInvites`/`useAcceptInvite`/`useDeclineInvite` from here
- `features/tasks/TaskDrawer` — `AssigneePicker` from `members/`
- `features/layout/AppShell` — `CreateLobbyModal`; `Sidebar` — `LOBBY_TYPE_COLORS`
- `features/users/api/dev.ts` and `api/handlers.ts` — read `MOCK_LOBBIES`
  from here to enforce "can't delete a user who owns a lobby"

## Testing

Every subfolder has its own `__tests__/`. `LobbyMemberList`/`AddMemberModal`
tests share accessible-name constants from `src/test/lobbyMemberContent.ts`
— reuse those instead of hardcoding copy in a new member-flow test. See root
`docs/TESTING.md`.

## Access-revocation cache purge (security invariant)

`GET lobbies/{id}` returns `404` for both a missing lobby and one the caller
is no longer a member of (the backend doesn't distinguish, to avoid an
existence oracle). `useLobby(id)` treats a `404` as terminal: it disables
further fetching for that id (`enabled` gate, so a purged/no-data query
never bounces back into a refetch loop) and, in an effect keyed off that
disablement, calls `removeLobbyScopedQueries` so the stale lobby — and
everything scoped to it — is actually gone from the cache, not just hidden
by a render guard. `LobbyNotFoundState` renders unconditionally on error;
its copy ("may have been deleted, or you may not have access") must stay
neutral — never confirm that a lobby exists for a caller who isn't a member.

The same helper runs on the two other ways a caller loses access to a
lobby while the SPA is open:

- **Delete** (`useDeleteLobby`'s `onSuccess`) — owner-only, purges before
  invalidating the my-lobbies list.
- **Leave** (`LobbyDangerZoneCard.handleLeave`'s `onSuccess`) — self-removal
  via `useRemoveMember`; the component calls the purge (an owner removing
  *another* member keeps using `useRemoveMember`'s existing
  `setQueryData`/`invalidateQueries` path unchanged, since the owner keeps
  their own access).

## Known gaps

- `removeMember`/`updateLobbyOwner` have no optimistic UI — they wait for
  the mutation to settle before re-rendering the member list.
- Invite creation supports either `userId` or `userEmail`, but the UI
  (`AddMemberModal`) only ever supplies `userId` — email-based invites are
  wired in the API layer but not yet exposed in the UI.
