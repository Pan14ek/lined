# CONTEXT.md — `src/features/settings/`

## Purpose

The User Settings page: profile, password, appearance, notifications, and
danger-zone (delete account) cards. This feature owns the **page shell**
(`SettingsCard`, `SettingsRow`, `SettingsMenu`) but not the underlying data
— profile/password mutations call `features/users`, and notification
toggles call `features/notifications`. `LobbySettingsPage` (a different
page, for per-lobby settings) reuses `SettingsCard` from here too.

## Structure

```
settings/
  SettingsCard.tsx    shared card shell: id + title + row list + optional footer
  SettingsRow.tsx      label(+description) on the left, control on the right;
                       exports SETTINGS_INPUT_CLASS for consistent input styling
  SettingsMenu.tsx     left-nav jump links between cards on the settings page
  cards/               AppearanceCard, PasswordCard, ProfileCard,
                       NotificationsCard, DangerZoneCard — the five actual
                       User Settings page sections
  pages/UserSettingsPage.tsx
```

No `model/`, `api/`, `hooks/`, or `lib/` — this feature has no DTO or API
calls of its own; every card's mutation hook belongs to the feature that
owns that data.

## Depends on

- `features/users/hooks/useUserSettings` — `useUpdateUser` (Profile/Password
  cards), `useDeleteAccount` (DangerZoneCard)
- `features/users/hooks/useCurrentUser` — `UserSettingsPage`
- `features/notifications/hooks/useNotifications` — `NotificationsCard`
- `components/ConfirmDialog` (shared) — DangerZoneCard's delete confirmation

## Depended on by

- `features/lobby/pages/LobbySettingsPage.tsx` and
  `features/lobby/settings/*` — reuse `SettingsCard` as the shared card
  shell for lobby-level settings, even though those cards live in `lobby/`

## Testing

Each card has a colocated test in `cards/__tests__/`; `SettingsCard.tsx`
and `SettingsRow.tsx` have their own tests directly under `__tests__/`. See
root `docs/TESTING.md`.

## Known gaps

None specific to this folder.
