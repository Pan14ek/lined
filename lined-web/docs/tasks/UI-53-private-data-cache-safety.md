# Task 53 — Private Data Cache Safety

**Branch:** `feature/ui-53-private-data-cache-safety`

*Depends on Task 51 (private events) and Task 52 (private tasks) landing
first — this task audits every visibility-aware query key those tasks
introduced. Also depends on backend PE-BE-04 (cross-surface audit) so
dashboard/search/statistics responses are already requester-scoped by the
time this task verifies client-side cache handling. No mockup screen.*

## Detailed description

A correct backend and a correct create/edit UI are not sufficient on their
own: TanStack Query caches responses in memory (and, depending on config,
persisted storage), and a shared physical device or an account switch
without a full reload could otherwise leave a previous user's private event
or task titles visible in a stale cache. This task implements the
logout/account-switch cache-clearing and query-invalidation rules from
`backend/lined/docs/private-events-and-tasks-system-design.md` §17.6, and
builds the cross-feature privacy regression test suite from §23.6-§23.7
(web-side items).

## Idea of this task

This is explicitly called out in the design doc as a threat the backend
cannot fix by itself (§22.1 "frontend cache shows previous user's private
data after logout"). It's sequenced last in the batch because it needs
every other private-data query key (from Tasks 51 and 52, plus whatever
PE-BE-04 changed on dashboard/search/statistics) to exist before it can
audit them all in one pass instead of re-auditing after every later change.

## Development steps

1. Audit `src/lib/apiClient.ts`, the `auth` Zustand store, and every
   feature's TanStack Query hooks for where user identity flows in. On
   logout (and on account switch, if the app supports switching without a
   full page reload):
   - call `queryClient.clear()` (or targeted `removeQueries` for every
     query key namespaced under events/tasks/dashboard/notifications/
     lobby stats — prefer `clear()` for simplicity unless a targeted
     approach is already established elsewhere in the codebase);
   - reset feature-specific in-memory Zustand stores that could hold
     event/task content (e.g. `calendar` store's currently-open event
     detail, `createMenu` overlay state) — not just the `auth` store.
2. Confirm (do not implement new persistence) that no event/task response
   body is written to `localStorage`/`sessionStorage` — TanStack Query's
   default in-memory cache should not be paired with a persister plugin for
   these query keys. If a persister is already configured app-wide, add an
   explicit exclusion for event/task/dashboard query keys.
3. Ensure private titles never appear in `document.title` or the URL (query
   string or path segment) for event/task detail views — check
   `EventDetailPanel`, `DayAgendaModal`, task detail routes, and any
   `useEffect` that sets `document.title`.
4. Add query invalidation on visibility transitions: changing an event or
   task from `SHARED` → `PRIVATE` or back must invalidate every query key
   that could still show the stale visibility (calendar list/detail,
   lobby/global task lists, dashboard, notifications, search) so another
   open tab/session for the *same* user doesn't show contradictory state,
   and so the owner's own view updates immediately.
5. Add the QUERY_KEYS entries needed for the above to
   `src/lib/constants.ts` if any are missing (do not inline query-key
   strings, per repo convention).
6. Build the privacy regression test suite covering the web-side items
   from design §23.6/§23.7: default visibility, private-selection
   explanation, notify-toggle disabling, assignee lock, lock-indicator
   accessibility, another-user fixture never rendering private content,
   query invalidation on visibility change, logout clearing cached private
   items, shared-to-private warning, and normal not-found rendering for a
   `404`'d private resource.
7. Tests, then `npm run lint && npm run typecheck && npm test && npm run
   build`.

## Final / expected result

- Logging out (or switching accounts, if supported) clears the query cache
  and any in-memory store holding event/task content — a subsequent
  `screen.getByText`/DOM query for a previous session's private title finds
  nothing.
- No private title ever reaches `localStorage`, `sessionStorage`,
  `document.title`, or a URL.
- Changing an item's visibility invalidates every dependent query so stale
  private/shared state doesn't linger anywhere in the app for that same
  user.
- The full web-side privacy regression suite (§23.6/§23.7 items) passes.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all
  pass.

## Tests to add

- **Unit/integration — logout**: seed the query cache and a feature store
  with private event/task content, trigger logout, assert the cache is
  cleared (`queryClient.getQueryCache().getAll()` is empty or scoped
  queries are gone) and the relevant Zustand stores reset to initial state.
- **Integration — visibility-change invalidation**: toggling an event's or
  task's visibility triggers a refetch/invalidation of calendar, task
  list, dashboard, and search query keys (assert via MSW request-count or
  query cache state, not implementation detail).
- **Static/regression — no persisted private content**: assert (via a
  jsdom `localStorage`/`sessionStorage` spy in tests, or a code-level check
  if a persister config exists) that event/task response bodies are never
  written to persisted storage.
- **Regression — full §23.6/§23.7 checklist**: one test file per item
  listed in step 6 above, most of which should already exist from Tasks
  51/52 — this task's job is to fill any gaps and add the logout/
  invalidation-specific ones.

## Risk & follow-ups

- A full application lock (PIN/biometric) for a shared physical device is
  explicitly out of scope (§17.6, §22.2) — do not build one here.
- If the app has no account-switch-without-reload flow today, scope this
  task to logout only and note the account-switch case as a follow-up once
  that flow exists.
