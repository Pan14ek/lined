# Task 51 — Private Events

**Branch:** `feature/ui-51-private-events`

*Depends on Task BE PE-BE-01 (private event access enforcement, ships the
authorization behavior) and PE-BE-02 (`visibility` field on `EventDto`).
No mockup screen exists for this feature — build to the design doc's
copy/behavior spec directly.*

## Detailed description

Add a visibility control to the event create/edit form (`CreateEventModal`)
so a user can mark an event `SHARED` (default) or `PRIVATE`, with the
behavior and copy specified in
`backend/lined/docs/private-events-and-tasks-system-design.md` §17.1 and
§17.3: private events disable "Notify members," show a non-retroactive
secrecy warning when converting shared → private, and render as a locked
item (title + lock icon, no extra detail) on the calendar for their owner
only — another lobby member must see nothing at all for that time slot
beyond the existing free-slot unavailability.

## Idea of this task

The backend (PE-BE-01/02) already refuses to leak another member's private
event through any API response, but the UI still needs to (a) let a user
create one, and (b) never accidentally render private data client-side —
e.g. never put a private title in the DOM, a tooltip, `document.title`, or
a URL for anyone other than the owner. The non-retroactive-secrecy warning
exists because backend privacy correctness doesn't undo what a member
already saw before a shared event was converted — the UI has to say that
plainly instead of implying perfect secrecy.

## Development steps

1. Extend `src/types/index.ts` event types with `visibility: "PRIVATE" |
   "SHARED"` (keep `shared?: boolean` optional/deprecated during backend's
   transition period per PE-BE-02, but the UI itself should only read/write
   `visibility`).
2. Add MSW handlers/fixtures in `src/test/handlers/` for private events:
   an owner fixture that returns the event normally, and a non-owner
   fixture where the private event is absent from list responses and the
   detail endpoint 404s.
3. Add a `Visibility` control (two-option toggle: "Shared with lobby" /
   "Private") to the event form, defaulting to `SHARED`. Selecting
   `PRIVATE`:
   - disables the "Notify members" toggle;
   - if "Notify members" was previously enabled, reset it to `false` before
     submit.
4. When editing an existing `SHARED` event and the user switches to
   `PRIVATE`, show the warning: "Making this private removes it from other
   members' views, but anyone who already saw it may remember its
   details." (design §7.7, §17.1). Only render the visibility control at
   all for the event owner — other members never see it, even read-only.
5. Calendar rendering (`WeekGrid`/`MonthGrid`/day-agenda event cards):
   for the owner, prefix the event title with a lock icon (accessible
   label, not color-only per §17.7) when `visibility === "PRIVATE"`. For
   any event absent from the API response (another member's private
   event), render nothing — no placeholder card, no empty slot marker
   beyond the existing free-slot unavailable styling.
6. Add all new copy strings to the i18n catalog; ensure the lock icon has
   an `aria-label` and the visibility control and warning are reachable and
   operable via keyboard.
7. Tests (see below), then `npm run lint && npm run typecheck && npm test
   && npm run build`.

## Final / expected result

- New events default to `SHARED`; the form clearly shows the current
  choice.
- Selecting `PRIVATE` disables and clears "Notify members."
- Converting an existing shared event to private shows the non-retroactive
  warning before/at submit.
- Only the owner ever sees the visibility control or a lock badge for their
  own private event.
- A non-owner's calendar view contains zero DOM trace of another member's
  private event beyond the free-slot effect already produced by the
  backend.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.

## Tests to add

- **Component — event form**: default visibility is `SHARED`; selecting
  `PRIVATE` disables "Notify members" and clears a previously-enabled
  value; owner-only rendering of the visibility control.
- **Component — shared→private warning**: appears only on that specific
  transition, not on private→shared or on create.
- **Component — calendar card**: owner view shows the lock icon with an
  accessible label for a private event; a fixture representing another
  member's session renders no card, no title text, and no hidden
  accessible text for the same time slot (assert absence, not just visual
  hiding).
- **Integration — MSW**: private-event fixtures for owner vs. non-owner
  produce the API-shaped responses described above; a `404` on direct
  detail fetch for a non-owner renders the app's normal not-found state,
  not a "this is private" message (matches backend §13).

## Risk & follow-ups

- Do not build a `SELECTED_MEMBERS` or partial-visibility UI — out of scope
  per design §5/§28.
- Filters (All/Shared/Private) are optional per §17.5 and not required for
  this task; skip unless product explicitly asks.
