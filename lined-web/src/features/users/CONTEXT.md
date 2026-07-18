# CONTEXT.md — `src/features/users/`

## Purpose

The `UserDto` model, user lookup/search, and account CRUD. This feature
exists because user data is genuinely cross-cutting — auth, lobby member
lists, task assignees, and calendar attendees all need it — not because
there's a standalone "Users" page (there isn't one). See
`docs/ARCHITECTURE.md` ("Current features") for why this earned its own
feature instead of being duplicated or dumped in a shared bucket.

## Structure

```
users/
  model/index.ts    UserDto, UserCreateDto, UserUpdateDto,
                    UserSearchResultDto, UserPageDto, RoleDto
  api/               prod.ts + dev.ts + index.ts + mockData.ts + handlers.ts
  lib/constants.ts   QUERY_KEYS only
  hooks/
    useUsers.ts        useUser(id), useUsers(ids[]) (batched via useQueries),
                       useUserSearch(query)
    useCurrentUser.ts   useCurrentUser() — reads the auth store's userId,
                       delegates to useUser
    useUserSettings.ts  useUpdateUser, useDeleteAccount
```

No `pages/` or standalone UI components — every user-facing surface for
this data lives in the feature that displays it (`settings/cards/ProfileCard`,
`lobby/members/*`, `notifications/InviteCard`, etc.).

## API surface

`prod.ts`: `GET users/{id}`, `POST users`, `PATCH users/{id}`,
`GET users/search?q=`, `DELETE users/{id}`.

`createUser` is called by `features/auth`'s `useSignUp`, not from within
this feature's own UI. `deleteUser` in `dev.ts`/`api/handlers.ts` rejects
(409) if the target owns a lobby, checked against `features/lobby`'s
`MOCK_LOBBIES` — see `depends on`.

## Depends on

- `features/lobby/api/mockData` — `MOCK_LOBBIES`, used only inside
  `dev.ts`/`handlers.ts` to enforce "can't delete an account that owns a
  lobby" without a real backend

## Depended on by

Nearly every other feature: `auth` (sign-up), `lobby` (member
list/search/assignee picker), `tasks` (assignee resolution), `dashboard`
(current user, free-slot other-member name), `notifications` (invite
sender), `layout` (`Sidebar`/`TopBar` current-user display), `settings`
(profile/password/delete-account). Cross-feature imports of `useUsers`,
`useUser`, `useCurrentUser`, or the `model` from here are normal — this is
the one feature every other feature is expected to depend on.

## Testing

Colocated `__tests__/` per hook file. See root `docs/TESTING.md`.

## Known gaps

- `RoleDto` is modeled (mirrors the backend's role concept) but nothing in
  the frontend reads or displays it yet — no role-based UI gating exists.
- `useUsers(ids)` fires one query per id (`useQueries`) rather than a single
  batched `GET users?ids=...` — fine at current lobby sizes, would need a
  real batch endpoint if member counts grow much.
