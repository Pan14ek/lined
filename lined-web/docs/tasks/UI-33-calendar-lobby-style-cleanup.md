# Task 33 — Calendar and Lobby Style Cleanup

**Branch:** `feature/ui-33-calendar-lobby-style-cleanup`

*Depends on Task 32.*

## Development steps

1. Extract the duplicated agenda event row from the global and lobby calendar views into a calendar-owned presentational component.
2. Convert calendar and lobby selected-state Tailwind template literals to `cn()` with semantic booleans.
3. Preserve the existing tab, radio, button, keyboard, and ARIA behavior.
4. Add focused tests for selected/unselected agenda and selection states.

## Expected result

Calendar and lobby selection logic remains in its parent while visual state is readable and the two agenda views share one event-row implementation.

## Verification

`npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run build` pass. Compare calendar and lobby screens with the mockups at 1280x800.
