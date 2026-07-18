# CONTEXT.md — `src/features/layout/`

## Purpose

The authenticated app shell: sidebar navigation, top bar, and the outlet
that renders the current route plus every global modal/drawer overlay. Not
a "feature" in the product sense (no page of its own) — it's the
composition root that every other feature's global overlay plugs into.

## Structure

```
layout/
  AppShell.tsx    <Outlet/> + global overlays (CreateLobbyModal, CreateEventModal,
                  TaskDrawer, ReserveSlotModal), driven by store/createMenu.ts
  Sidebar.tsx     lobby nav list + current-user footer
  TopBar.tsx      route-title header
```

No `model/`, `api/`, or `hooks/` — this feature has no data of its own.

## Depends on

- `features/lobby/CreateLobbyModal`
- `features/calendar/events/{CreateEventModal,ReserveSlotModal}`
- `features/tasks/TaskDrawer`
- `features/users/hooks/useCurrentUser` (Sidebar/TopBar)
- `features/lobby/lib/constants` — `LOBBY_TYPE_COLORS` (sidebar lobby dots)
- `src/store/createMenu.ts` — which overlay (if any) is open, and its seed
  data (`editingTask`, `reserveSlotInitial`, etc.)

## Depended on by

- `src/router.tsx` — `AppShell` is the element for every authenticated route

## Testing

`AppShell.test.tsx` covers overlay open/close wiring end-to-end (via
`useCreateMenuStore`); `Sidebar.test.tsx` and `TopBar.test.tsx` are
presentational. See root `docs/TESTING.md`.

## Known gaps

None specific to this folder — it's intentionally thin.
