# Task 19 — Event Conflict Warnings

**Branch:** `feature/ui-19-event-conflict-warnings`

*Depends on Tasks 10 (calendar enhancements) and 11 (reserve slot) — it
extends `CreateEventModal` and `ReserveSlotModal`. No backend work needed.*

## Detailed description

The backend already exposes two conflict-detection endpoints and the API
client already wraps them (`findConflicts` / `checkUserConflict` in
`src/api/events.ts`) — **but nothing in the UI calls them**. Users can
double-book themselves or their partner without any hint until the other
person notices.

1. **Conflict check on time change** — in `CreateEventModal` (create *and*
   edit mode) and `ReserveSlotModal`, once lobby + start + end are all set,
   debounce-call `GET /api/calendar/conflicts?lobbyId=&start=&end=&requesterId=`
   and render the result inline below the time fields.
2. **Warning banner (non-blocking)** — amber banner listing who is busy and
   with what: "Anastasiia already has *Yoga class* 6:00 – 7:00 PM. You are
   free at this time." Creating is still allowed — the primary button label
   switches to **"Create Anyway"** while a conflict is shown.
3. **Next-free-slot hint** — reuse the existing free-slot logic
   (`GET /api/lobbies/{id}/free-slots`) to suggest the next slot after the
   chosen start where everyone is free; clicking the hint rewrites the
   start/end fields (same duration).
4. **Silence states** — no banner while loading, on check failure (fail
   open, never block creation on a failed conflict check), or when the
   conflicting event is the event currently being edited (filter it out by
   id in edit mode).

## Idea of this task

Lined's core promise is finding time *together* — silently allowing
double-bookings undermines the product's whole point. The endpoints exist
and are tested server-side; this is pure UI wiring.

## Reference to mockup

- New screen id **`event-conflict`** (`http://localhost:4321/#event-conflict`):
  New Event modal with the amber `.conflict-banner` (title, per-member
  detail line, "Next slot when everyone is free" hint) and the
  "Create Anyway" footer button.

## Development steps

1. Hook `useEventConflicts(params, enabled)` in `src/hooks/useEvents.ts`
   wrapping `findConflicts`, keyed under a new `QUERY_KEYS` entry, enabled
   only when lobbyId/start/end are valid; debounce inputs via the existing
   `useDebouncedValue`.
2. Component `ConflictBanner` (`src/components/ConflictBanner.tsx`): maps
   `EventConflictDto[]` to per-member lines (resolve names via `useUsers`),
   plus the optional next-free-slot hint (callback prop
   `onPickSuggestion(start, end)`).
3. Wire into `CreateEventModal` (both modes; exclude the edited event's own
   id from results) and `ReserveSlotModal` (a reserved slot should rarely
   conflict, but a user can change nothing here — banner only).
4. Primary button label swaps to "Create Anyway" while conflicts are shown;
   no disabling.
5. Tests (MSW): banner appears for an overlapping event and names the busy
   member; no banner when the API returns `[]`; edit mode ignores the
   event's own overlap; suggestion click rewrites the time fields; a 500
   from the conflicts endpoint neither blocks nor shows the banner.

## Final / expected result

- Choosing a time that clashes with any lobby member's event shows an
  inline, non-blocking warning with a one-click better suggestion, in both
  the event modal and the reserve-slot modal.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Overlaps within a lobby | `GET /api/calendar/conflicts?lobbyId=&start=&end=&requesterId=` → `EventConflictDto[]` |
| Single-user check (optional) | `GET /api/calendar/user-conflict?userId=&start=&end=&requesterId=` → `UserConflictDto` |
| Next-free-slot hint | `GET /api/lobbies/{id}/free-slots?from=&to=` |
