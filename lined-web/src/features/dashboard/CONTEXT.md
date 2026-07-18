# CONTEXT.md — `src/features/dashboard/`

## Purpose

The home page: lobby cards, upcoming events, my-tasks summary, free-slot
banner, and the first-run onboarding hero. It's a composition layer over
other features' data more than an owner of its own domain model — it has
no `model/` folder, because it has no DTO of its own.

## Structure

```
dashboard/
  DashboardHero.tsx      first-run "create your first lobby" hero (zero-lobby state)
  CreateMenu.tsx          "+ Create" dropdown (event/task/lobby/reserve-slot)
  lobbies/                LobbyCard, LobbyCardGrid
  widgets/                MyTasksList, UpcomingEventsList, FreeSlotBanner, StatusBadge
  hooks/useDashboard.ts    useFreeSlotBanner, useFreeSlotCandidates,
                          useNextFreeSlotHint, useLobbyFreeSlots
  pages/DashboardPage.tsx
```

`useDashboard.ts` also exports `findEarliestFreeSlot` (a pure helper) and
the `FreeSlotBannerData`/`FreeSlotCandidate` types consumed by the widgets
and by `calendar`'s `ReserveSlotModal`.

## API surface

No `api/` folder — every request goes through another feature's API
(`lobby`'s `getFreeSlots`, `tasks`'s task list, `calendar`'s event list, via
their respective hooks). This feature is purely a consumer.

## Depends on

- `features/lobby/api` + `features/lobby/lib` — `getFreeSlots`,
  `QUERY_KEYS.lobbyFreeSlots`, `useMyLobbies`
- `features/tasks/hooks` — `useMyTasks`
- `features/calendar/hooks` — `useUpcomingEvents`
- `features/notifications/hooks` — `useMyInvites` (pending-invites banner)
- `features/users/hooks` — `useUser`, `useCurrentUser`
- `features/lobby/lib/constants` — `LOBBY_TYPE_*` maps and `LOBBY_TYPES`
  (onboarding hero's lobby-type picker)

## Depended on by

- `features/calendar/hooks/useEvents.ts` and
  `features/calendar/events/ReserveSlotModal.tsx` — reuse
  `useNextFreeSlotHint`/`useFreeSlotCandidates` from here rather than
  duplicating free-slot logic, since a "free slot" is fundamentally a lobby
  concept this feature happens to compute first

## Testing

Colocated `__tests__/` per component/hook file. `DashboardPage.test.tsx`
covers the composed page (multiple MSW-backed widgets loading together);
individual widget tests mock only their own hook's data. See root
`docs/TESTING.md`.

## Known gaps

- Free-slot detection only looks at 2-member lobbies with a fixed 7-day
  window and 1-hour minimum duration (`FREE_SLOTS_WINDOW_DAYS`,
  `MIN_FREE_SLOT_MS` in `useDashboard.ts`) — not configurable per user yet.
