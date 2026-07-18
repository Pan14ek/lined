# CONTEXT.md — `src/store/`

## Purpose

Global Zustand stores for **UI-only state** — never server data (that's
TanStack Query's job; see `docs/ARCHITECTURE.md`). Small, focused, one
concern per store.

## Structure

```
store/
  auth.ts        useAuthStore — { userId }, persisted to localStorage
                 ('lined-auth'). Read by src/lib/apiClient.ts to set the
                 X-User-Id header, and by features/users/hooks/useCurrentUser
  calendar.ts     useCalendarStore — week/month view mode, selected date,
                 selected event id, hidden-lobby filter set for the global
                 Calendar page
  createMenu.ts   useCreateMenuStore — which global overlay is open
                 ('event' | 'task' | 'reserveSlot' | create-lobby), plus its
                 seed data (editingTask, reserveSlotInitial, lobbyTypeInitial,
                 taskInitialStatus). Driven by the "+ Create" menu and read by
                 features/layout/AppShell to decide which overlay to render
  settings.ts     useSettingsStore — { theme }, persisted to localStorage
                 ('lined-settings'). UI-only preference; no backend field
                 exists for it yet
```

## Depends on

`zustand` + `zustand/middleware` (persist) only — no feature imports here.
`auth.ts`/`calendar.ts`/`createMenu.ts` do import feature `model` **types**
(`LobbyType`, `TaskDto`, `TaskStatus`, `EventDto`-adjacent) for their state
shape — that's expected; a store can depend on a feature's type without the
feature depending back on the store.

## Depended on by

- `auth.ts` — `src/lib/apiClient.ts`, `features/users`, every auth page
- `calendar.ts` — `features/calendar`, `features/lobby/calendar`
- `createMenu.ts` — `features/layout/AppShell`, `features/dashboard/CreateMenu`,
  and every feature whose overlay it opens (lobby, calendar, tasks)
- `settings.ts` — `features/settings/cards/AppearanceCard`

## Testing

Stores are plain Zustand — call `useXStore.getState()`/`.setState()`
directly in tests rather than mocking them; see
`features/dashboard/__tests__/DashboardHero.test.tsx` for the pattern
(`beforeEach(() => useCreateMenuStore.setState({...}))`). See root
`docs/TESTING.md`.

## Known gaps

- `settings.ts`'s `theme` has no corresponding backend field — it's
  local-only for now, so switching devices won't carry the preference over.
