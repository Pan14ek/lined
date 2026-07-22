# Task 35 — Feature-Flag Foundation

**Branch:** `feature/ui-35-feature-flags-foundation`

**Dependencies:** Backend
[FF-BE-01](../../../backend/lined/docs/tasks/FF-BE-01-feature-flag-core.md)
defines the real public API. UI-35 may be developed MSW-first against that
contract.

## Detailed description

Add the shared frontend feature-availability seam described in the canonical
[Feature Flags design](../../../backend/lined/docs/feature-flags.md). This task
owns discovery, query state, disabled-response recognition, and reusable
guards. It does not yet sweep existing product surfaces or add the admin page.

Create `src/features/featureFlags/` because flags are domain data with their
own API, model, hooks, constants, and components. Do not place flag data in
Zustand or duplicate it across existing features.

## API contract

Consume unauthenticated `GET /api/features`:

```json
{
  "flags": {
    "dashboard.feature.enabled": true,
    "lobbies.feature.enabled": true,
    "calendars.feature.enabled": true,
    "tasks.feature.enabled": true,
    "notifications.feature.enabled": true,
    "settings.feature.enabled": true,
    "subscriptions.feature.enabled": true
  }
}
```

Recognize protected endpoint failures only when they are `503` RFC 7807 with
type `https://errors.lined.app/feature.disabled` and a known `feature` value.

## Development steps

1. Add the seven-key union/catalog and `PublicFeatureFlagsResponse` under the
   feature's `model/`; unknown keys evaluate as disabled.
2. Add `api/prod.ts`, `dev.ts`, `index.ts`, `mockData.ts`, and `handlers.ts`
   with identical dev/prod signatures and one fixture source.
3. Add `QUERY_KEYS`, `useFeatureFlags`, and `useFeatureEnabled`. Configure
   five-minute `staleTime`, ten-minute `refetchInterval`, and
   `refetchOnWindowFocus: true`.
4. Add a root discovery gate that prevents flagged application content from
   flashing before the first response. Loading and failure/retry must be
   distinct states.
5. Add reusable route/content guards. A disabled non-Dashboard route redirects
   to `/` with route state identifying the unavailable known feature.
6. Parse disabled `ProblemDetail` centrally in shared API/query infrastructure,
   using a cloned response when body inspection is needed. Invalidate the
   feature-flags query on a recognized error without swallowing the original
   request failure.
7. Register MSW handlers in the common test handler list and document the new
   feature folder/context.

## Final / expected result

All UI code has one typed, cached, testable source for public availability.
Initial discovery never flashes disabled content, a discovery outage offers a
retry rather than assuming enabled, and authoritative backend disablement
causes fast flag revalidation.

## Test scenarios

- Public API prod/dev implementations return the same typed shape.
- Enabled known key returns true; disabled, missing, and unknown keys return
  false.
- Query uses the required stale/refetch/focus options and one stable key.
- Initial loading does not render guarded content.
- Discovery failure renders a retry action; retry can recover successfully.
- Enabled route/content guard renders children.
- Disabled route redirects to `/` with neutral route state.
- Recognized `503 feature.disabled` invalidates the flag query and preserves
  the original error for the caller.
- Ordinary `503`, other RFC 7807 errors, and malformed bodies do not trigger
  feature invalidation.
- MSW success, disabled-state, and discovery-failure handlers are covered.

## Verification

From `lined-web/` run:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Also run `git diff --check` from the monorepo root.

## Non-goals

No existing navigation/page sweep, admin API/UI, targeting, local override,
percentage rollout, or WebSocket/SSE subscription.
