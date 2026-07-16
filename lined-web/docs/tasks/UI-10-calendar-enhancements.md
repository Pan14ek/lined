# Task 10 — Calendar Enhancements (Edit Event, Month View, Legend)

**Branch:** `feature/ui-10-calendar-enhancements`

## Detailed description

The global Calendar page (`src/pages/CalendarPage.tsx`) already implements
the week grid, event creation, selection, deletion, and free-slot bands.
Close the remaining gaps against the mockup:

1. **Edit event** — the `EventDetailPanel`'s "Edit event" button is a TODO.
   Reuse `CreateEventModal` in edit mode (pre-filled fields, "Save changes"
   submit) calling `PATCH /api/calendar/events/{id}`.
2. **Month view** — the Week/Month toggle exists but Month is not
   implemented. Add a month grid: 5–6 rows × 7 days, up to ~3 event chips
   per day + "+N more"; clicking a day switches to that week in week view.
3. **Legend** — bottom legend bar per mockup: Couple / Family / Friends /
   Work dots + "Free slot".
4. **Now-line** — verify the red current-time indicator on today's column
   exists in `WeekGrid`; add it if missing.

## Idea of this task

Bring the most complete page to full mockup parity so the calendar is
feature-complete before the Reserve Slot flow (Task 11) builds on it.

## Reference to mockup

- File: `mockups/index.html`, screen id **`calendar`** (nav tab "Calendar");
  the event-detail panel and legend are on the same screen.
- Serve with `npx serve -p 4321 mockups/`; no deep links yet — see
  [../UI_TASKS.md](../UI_TASKS.md) for how to add them.
- Note: the mockup has **no Month-view screen** — design the month grid in
  the same visual language (tokens, chip colours by lobby type) and consider
  adding a `calendar-month` screen to the mockup for reference.

## Development steps

1. Extend `CreateEventModal` with an optional `event` prop → edit mode:
   title "Edit Event", fields pre-filled, submit uses a new
   `useUpdateEvent()` mutation (`PATCH`, invalidate events).
   Lobby cannot be changed on edit (`EventUpdateDto` has no `lobbyId`) —
   render the lobby selector disabled.
2. Wire `EventDetailPanel.onEdit` to open the modal in edit mode.
3. Extend `useCalendarStore` for month mode (month anchor date, prev/next
   month) and extend `useWeekEvents` → `useRangeEvents(from, to)` for a
   month range.
4. Build `MonthGrid` (`src/components/MonthGrid.tsx`): day cells, today
   highlight, event chips (lobby-type colour), overflow "+N more", day click
   → week view of that week.
5. Add `CalendarLegend` component; render under both views.
6. Tests (MSW): edit flow PATCHes and re-renders the updated title; month
   view shows chips on the right days; toggle switches views; legend renders.

## Final / expected result

- Events can be edited end-to-end from the detail panel.
- Week/Month toggle fully works; month view navigates months and drills into
  weeks.
- Legend matches the mockup.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Update event | `PATCH /api/calendar/events/{id}` — `EventUpdateDto { title?, shared?, startAt?, endAt?, timezone? }` → `EventDto` |
| Range events | `GET /api/calendar/events?from=&to=` → `EventDto[]` |
| Delete | `DELETE /api/calendar/events/{id}` |

**Backend gaps:** `EventDto` has no `location` field (mockup shows
"📍 Whole Foods Market") — omit the location row for MVP and flag a backend
follow-up; an event's lobby cannot be changed after creation.
