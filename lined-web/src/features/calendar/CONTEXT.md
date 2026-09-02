# CONTEXT.md — `src/features/calendar/`

## Purpose

Everything about shared calendar events: the week/month grid, event
create/edit, conflict detection, and free-slot reservation. Consumed both
standalone (the global Calendar page) and embedded (a lobby's Calendar tab)
— see `depended on by` below.

## Structure

```
calendar/
  CalendarTopBar.tsx           view-mode switcher + lobby-visibility filter
  grid/                        MonthGrid, WeekGrid, CalendarLegend, WeekEmptyBanner
  events/                      CreateEventModal, ReserveSlotModal, ConflictBanner
  panels/                      DayAgendaPanel, EventDetailPanel
  model/index.ts                EventDto, EventCreateDto, EventUpdateDto,
                                EventConflictDto, UserConflictDto
  api/                          prod.ts + dev.ts + index.ts + mockData.ts + handlers.ts
  lib/                          calendarUtils.ts (grid math, event-lane layout,
                                date/time formatting), freeSlots.ts, constants.ts
                                (DEFAULT_LEGEND_ITEMS, QUERY_KEYS)
  hooks/useEvents.ts             useWeekEvents, useMonthEvents, useLobbyWeekEvents,
                                useUpcomingEvents, useCreateEvent, useUpdateEvent,
                                useDeleteEvent, useEventConflicts, useConflictCheck
  pages/CalendarPage.tsx        the global calendar route
```

## API surface

`prod.ts`: `GET/POST calendar/events`, `PATCH/DELETE calendar/events/{id}`,
`GET calendar/conflicts`, `GET calendar/user-conflict`.

## Depends on

- `features/dashboard/hooks/useDashboard` — `useNextFreeSlotHint` (conflict
  suggestion) and `useFreeSlotCandidates` (`ReserveSlotModal`'s slot picker)
- `features/tasks/model` — `TaskStatus` type, used only by a due-date
  formatter in `calendarUtils.ts` (`formatTaskDueDate`) that's shared with
  the tasks feature
- `features/auth/AuthAlert` — generic error banner in the create/reserve
  modals
- `features/users/hooks/useUsers` — resolving attendee names in
  `ConflictBanner`/`ReserveSlotModal`; current-user identity comes from
  `GET /api/users/me`

## Depended on by

- `features/lobby/calendar/LobbyCalendarView.tsx` — imports `CalendarTopBar`,
  `WeekGrid`, `CreateEventModal`, `EventDetailPanel`, `WeekEmptyBanner`
  directly rather than duplicating calendar rendering for the lobby's
  Calendar tab
- `features/layout/AppShell.tsx` — mounts `CreateEventModal`/`ReserveSlotModal`
  as global overlays driven by `store/createMenu.ts`
- `src/store/calendar.ts` — imports `calendarUtils` date helpers

## Testing

Colocated `__tests__/` per component/hook/lib file. `calendarUtils.test.ts`
is the largest pure-function suite in the app (grid math, event-lane
assignment, free-slot computation) — read it before changing any date/time
helper. See root `docs/TESTING.md`.

## Known gaps

- `findConflicts`/`checkUserConflict` mocks (`dev.ts`) always return
  "no conflict" — there's no in-memory conflict simulation, only the real
  backend computes it.
