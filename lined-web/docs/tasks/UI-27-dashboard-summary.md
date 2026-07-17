# Task 27 — Dashboard Summary Adoption

**Branch:** `feature/ui-27-dashboard-summary`

*Depends on Task 3 (dashboard). Mock-first against the proposed
`GET /api/dashboard/summary`; the visible UI barely changes — this is a
data-layer swap plus the counts the fan-out could never get right.*

## Detailed description

The dashboard currently issues 4+ requests (lobbies, events window, my
tasks, per-lobby free-slot probes) and still shows approximate per-lobby
counts. The backend proposal `dashboard-summary-api.md` returns everything
in one caller-scoped aggregate.

1. **One request** — `useDashboardSummary()` wrapping
   `GET /api/dashboard/summary?eventsUntil=&freeSlotHorizon=`; dashboard
   sections read from it instead of `useMyLobbies` + `useUpcomingEvents` +
   `useMyTasks` + `useFreeSlotBanner` (those hooks stay for their other
   consumers).
2. **Accurate lobby-card counts** — member / upcoming-event / open-task
   badges on `LobbyCardGrid` come from the aggregate's per-lobby counts
   instead of client-side approximations.
3. **Unread badge for free** — `NotificationBell` can seed its unread
   count from `unreadNotificationCount` (its own poll stays as the
   refresher).
4. **Graceful fallback** — the summary endpoint 404ing (backend not yet
   deployed) falls back to the current fan-out path, so the task can merge
   before the backend lands; remove the fallback once the endpoint is
   real. One skeleton (Task 25's `DashboardSkeleton`) covers the whole
   body since everything now loads together.

## Idea of this task

Fewer round-trips make the most-visited page the fastest one, and correct
counts make the lobby cards trustworthy. The aggregate also cuts the
mobile payload — which Task 22 cares about.

## Reference to mockup

- No new screen — the existing **`dashboard`** screen
  (`http://localhost:4321/#dashboard`) is the target; its lobby-card
  badges (👥 2 · 📅 1 · ☑ 3) are exactly the counts only this endpoint can
  provide accurately.

## Development steps

1. MSW handler for `GET /api/dashboard/summary` composing the existing
   mock data (types in `src/types` per the proposal's DTO).
2. `useDashboardSummary()` in `src/hooks/useDashboard.ts` (new
   `QUERY_KEYS` entry); invalidate it wherever lobby/event/task/invite
   mutations already invalidate their lists (helper for the shared
   invalidation set).
3. Swap `DashboardPage`/`LobbyCardGrid`/`FreeSlotBanner` reads; keep prop
   shapes so child components don't churn.
4. 404-fallback wrapper (feature-detect once per session).
5. Tests (MSW): dashboard renders all sections from one summary response;
   counts match the payload; 404 → fallback path still renders; a task
   mutation invalidates the summary.

## Final / expected result

- The dashboard renders from one request with exact counts, falling back
  transparently while the backend endpoint is pending.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Aggregate | `GET /api/dashboard/summary?eventsUntil=&freeSlotHorizon=` |
| Fallback | existing lobbies/events/tasks/free-slots endpoints |

**Backend gap:** `feature/dashboard-summary-api` —
`backend/lined/docs/api-proposals/dashboard-summary-api.md`.
