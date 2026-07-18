# CONTEXT.md — `src/features/notifications/`

## Purpose

In-app notifications (task-assigned, shared-event-created) and notification
*preferences* (global + per-lobby). Does **not** own lobby invites — those
belong to `features/lobby` — but the notification bell and dashboard banner
both surface pending invites alongside real notifications, so this feature
imports `lobby`'s invite hooks for that dropdown.

## Structure

```
notifications/
  InviteCard.tsx              renders one pending invite (shared by bell/ and dashboard's banner)
  PendingInvitesBanner.tsx    dashboard-page banner listing pending invites
  bell/                       NotificationBell (header icon + dropdown trigger),
                              NotificationInbox (dropdown body: notifications + invites)
  model/index.ts               NotificationType, NotificationDeliveryChannel/Status,
                              NotificationPreferencesDto(+Update),
                              LobbyNotificationPreferencesDto(+Update),
                              NotificationDeliveryDto, NotificationDto
  api/                         prod.ts + dev.ts + index.ts + mockData.ts + handlers.ts
  lib/constants.ts             QUERY_KEYS only (no lookup-table constants —
                              notification copy is inline in the components)
  hooks/useNotifications.ts    useNotificationPreferences,
                              useUpdateNotificationPreferences,
                              useLobbyNotificationPreferences,
                              useUpdateLobbyNotificationPreferences,
                              useMyNotifications, useMarkNotificationRead
```

No `pages/` — notifications have no route of their own; they're a header
dropdown plus settings-card content embedded in `settings`/`lobby`.

## API surface

`prod.ts`: `GET/PATCH notifications/preferences`,
`GET/PATCH lobbies/{lobbyId}/notification-preferences`,
`GET notifications/mine`, `PATCH notifications/{id}/read`.

`useUpdateNotificationPreferences`/`useUpdateLobbyNotificationPreferences`
use the shared `useOptimisticPatchMutation` hook (`src/hooks/`, not
feature-owned) for instant toggle feedback.

## Depends on

- `features/lobby/hooks/useInvites` — `useMyInvites`, `useAcceptInvite`,
  `useDeclineInvite` (the invite half of the bell dropdown and the
  dashboard banner)
- `features/users/hooks/useUser` — resolving an invite's inviter name in
  `InviteCard`
- `components/ConfirmDialog` (shared, not feature-owned)

## Depended on by

- `features/settings/cards/NotificationsCard.tsx` — global preferences UI
- `features/lobby/settings/LobbyNotificationsCard.tsx` — per-lobby
  preferences UI
- `features/dashboard/pages/DashboardPage.tsx` — mounts `PendingInvitesBanner`
  and `NotificationBell`

## Testing

Colocated `__tests__/` per component/hook. `NotificationBell.test.tsx` and
`PendingInvitesBanner.test.tsx` both exercise the cross-feature invite
hooks via MSW — check `features/lobby/api/handlers.ts` if a fixture there
changes. See root `docs/TESTING.md`.

## Known gaps

- Polling interval for `useMyNotifications` is a fixed 60s
  (`NOTIFICATIONS_POLL_INTERVAL_MS`) — no push/websocket delivery yet.
- `NotificationDeliveryDto` (per-channel delivery status: IN_APP/EMAIL/PUSH)
  is modeled but not rendered anywhere in the UI yet.
