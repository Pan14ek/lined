# Task 29 — Lobby Statistics Tab

**Branch:** `feature/ui-29-lobby-stats`

*Depends on Task 5 (lobby tab bar). Mock-first against the proposed lobby
statistics API.*

## Detailed description

Nothing shows a lobby its own story — how much time the members actually
spent together, who does the chores. The stats proposal returns a windowed
aggregate; this task renders it as a `📊 Stats` lobby tab.

1. **Stat tiles** — four tiles for the selected month: **Time together**
   (`sharedTimeMinutes` humanized, with a vs-previous-month delta),
   **Shared events** (`sharedEventCount`), **Tasks completed**
   (`tasksCompleted` / `tasksCreated` with a completion %), **Free slots
   reserved** (if the API can't distinguish reserved-slot events in v1,
   drop the fourth tile rather than fake it — decide against the final
   DTO).
2. **Month picker** — a select of the last 12 months driving
   `from`/`to`; two parallel queries (selected + previous month) power the
   delta.
3. **"Who does what"** — per-member split bars (tasks completed, events
   organised) from `perMember`, colored with the members' avatar colors,
   with a legend — the fair-split view.
4. **States** — empty window ("Nothing yet this month — plan something
   ✨" linking to the calendar tab), skeleton tiles (Task 25 system), and
   a friendly note when the previous month has no data (no delta shown).

## Idea of this task

"Where life and quality time meet" deserves a receipt: making shared time
visible is the emotional payoff of all the scheduling, and the per-member
split is the honest conversation-starter families actually want. Also the
foundation for later gamification.

## Reference to mockup

- New screen id **`lobby-stats`** (`http://localhost:4321/#lobby-stats`):
  📊 Stats tab with month select, four `.stat-tile`s (26 h ↑ 4 h vs June,
  12 shared events, 23/30 tasks, 5 slots reserved) and the "Who does what"
  card with green/blue `.split-bar`s and legend.

## Development steps

1. MSW handler for `GET /api/lobbies/{id}/stats?from=&to=` with plausible
   seeded numbers for the last few months (types per the proposal DTO).
2. `useLobbyStats(lobbyId, from, to)` in `src/hooks/useLobbies.ts` (or a
   new `useLobbyStats.ts`), new `QUERY_KEYS` entry.
3. Components under `src/components/lobby/stats/`: `StatsTab`,
   `StatTile`, `MemberSplitBar`, `MonthPicker`; add the tab to
   `LobbyTabBar` (`?tab=stats`).
4. Humanize helpers: minutes → "26 h" / "1 д 2 год" (locale-aware — reuse
   the Task 24 layer if landed).
5. Tests (MSW): tiles render the DTO numbers; month change refetches with
   the right window; delta computed against the previous month; empty
   window renders the empty state; split bars proportional to
   `perMember`.

## Final / expected result

- Every lobby has a Stats tab telling members how much time they spent
  together and how the work splits, per month — against MSW until the
  backend ships.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Windowed aggregate | `GET /api/lobbies/{id}/stats?from=&to=` → `LobbyStatsDto` |

**Backend gap:** `feature/lobby-statistics-api` —
`backend/lined/docs/api-proposals/lobby-statistics-api.md` (requires task
`completedAt` persistence server-side).
