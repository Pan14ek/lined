# Task 30 — Calendar Sync (ICS Export & Import)

**Branch:** `feature/ui-30-calendar-sync`

*Depends on Task 12 (settings page). Mock-first against the proposed ICS
integration API.*

## Detailed description

Lined lives next to Google/Apple/Outlook calendars; the ICS proposal
bridges them without OAuth. This task adds a **Calendar Sync** section to
User Settings (new PREFERENCES menu item between "Language & Region" and
"Subscription").

1. **Export card** — explains the "secret address" model; on first visit a
   "Generate link" button (`POST /api/calendar/feed-token`), then a
   read-only URL field with **Copy** (clipboard + copied-state flash),
   **Regenerate link** (confirm: "old link stops working everywhere") and
   **Revoke** (danger-styled, confirm) actions, plus the treat-it-like-a-
   password warning.
2. **Import card** — drag-and-drop / browse for one `.ics` file, a lobby
   select (imported events are **private** — copy explains they block your
   free slots without exposing details), an **Import** button posting the
   file, and a result line ("14 added · 2 skipped (duplicates)") from the
   response; errors listed inline. Re-importing the same file updates
   rather than duplicates (UID dedupe server-side — surface that in copy).
3. **Calendar page hint** — a small "Sync ⇄" link on the calendar top bar
   pointing to the settings section (discoverability).

## Idea of this task

Free-slot detection is only as good as the busy time it can see; importing
the user's work calendar makes the signature feature accurate, and the
feed makes Lined events show up where people already look. Standards-based
80% of "Google Calendar integration" with none of the OAuth cost.

## Reference to mockup

- New screen id **`calendar-sync`**
  (`http://localhost:4321/#calendar-sync`): settings page with the
  Calendar Sync menu item active — Export card (URL field + Copy,
  Regenerate/Revoke row with warning) and Import card (dashed drop zone,
  lobby select, Import button, "✓ Last import: 14 added · 2 skipped"
  line).

## Development steps

1. MSW first: feed-token create/delete handlers (stateful token in the
   mock), import handler returning `{imported, skipped, errors}` and
   validating a `text/calendar` body.
2. `src/api/calendarSync.ts` + `useCalendarSync.ts` hooks:
   `useFeedToken`, `useCreateFeedToken`, `useRevokeFeedToken`,
   `useImportIcs` (multipart/text upload via ky).
3. Components under `src/components/settings/`: `CalendarSyncExportCard`,
   `CalendarSyncImportCard` (file input + drop handlers, client-side
   `.ics` extension/size validation before upload); add the settings menu
   item + route anchor; the calendar top-bar link.
4. Confirm dialogs for Regenerate/Revoke via the shared `ConfirmDialog`.
5. Tests (MSW): generate → URL shown; copy sets clipboard (mock);
   regenerate confirm swaps the token; revoke returns to the generate
   state; import happy path shows counts; non-ics file rejected client-
   side; server errors listed inline.

## Final / expected result

- Users can subscribe to their Lined events from any calendar app and
  import outside busy time as private events — fully exercised against
  MSW until the backend ships.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Create/revoke feed | `POST /api/calendar/feed-token`, `DELETE /api/calendar/feed-token` |
| Feed itself | `GET /api/calendar/feed/{token}.ics` (consumed by external apps) |
| Import | `POST /api/calendar/import?lobbyId={id}` |

**Backend gap:** `feature/calendar-ics-integration` —
`backend/lined/docs/api-proposals/calendar-ics-integration.md`.
