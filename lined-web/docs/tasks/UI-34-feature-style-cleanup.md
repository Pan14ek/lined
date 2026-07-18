# Task 34 — Feature Style Cleanup

**Branch:** `feature/ui-34-feature-style-cleanup`

*Depends on Task 32.*

## Development steps

1. Convert remaining feature-local conditional Tailwind template literals to `cn()` in tasks, dashboard, subscription, notifications, and layout.
2. Name complex state conditions where it improves readability; retain static class strings and one-off presentation inline.
3. Do not create generic wrappers for cards, dots, buttons, or containers.
4. Extend affected component tests for visual-state and accessibility behavior.

## Expected result

Conditional presentation is easy to read while application state, routes, requests, tokens, and responsive behavior remain unchanged.

## Verification

`npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run build` pass. Compare affected screens with the mockups at 1280x800.
