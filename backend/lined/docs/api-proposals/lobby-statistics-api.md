# API Proposal — Lobby Statistics

**Branch:** `feature/lobby-statistics-api`
**Status:** Proposed
**Motivation:** README Phase 2 ("Statistics — shared meals, completed tasks,
time together") and the foundation for gamification badges. Nothing in the
current API aggregates activity; the UI would have to fetch every task and
event ever created to compute totals.

## What the API should do

Member-only aggregate over a time window:

```
GET /api/lobbies/{id}/stats?from={timestamp}&to={timestamp}
→ 200 LobbyStatsDto
```

```json
{
  "lobbyId": 101,
  "from": "2026-06-01T00:00:00Z",
  "to": "2026-07-01T00:00:00Z",
  "sharedEventCount": 12,
  "sharedTimeMinutes": 1440,
  "tasksCompleted": 23,
  "tasksCreated": 30,
  "perMember": [
    { "userId": 42, "tasksCompleted": 12, "tasksAssignedOpen": 3, "eventsOwned": 5 },
    { "userId": 77, "tasksCompleted": 11, "tasksAssignedOpen": 2, "eventsOwned": 7 }
  ]
}
```

- `sharedEventCount` / `sharedTimeMinutes`: shared events overlapping the
  window and their summed duration — the "time together" number.
- Task counters computed from status transitions within the window (requires
  persisting a `completedAt` timestamp on tasks — set when status becomes
  `DONE`, cleared if reopened).
- `perMember` gives the fair-split view ("who does the chores") that feeds
  future badges and the AI task-distribution idea (README Phase 4).

**Errors:** `400` invalid window, `403` caller not a member, `404` unknown
lobby.

## Why it matters

- Unlocks a "Statistics" tab on the lobby page and streak/badge features
  without shipping raw event/task dumps to the client.
- `sharedTimeMinutes` is the product's own success metric ("quality time")
  made visible to users.

## Implementation notes

- Add `completedAt` to the task entity (`OffsetDateTime`, UTC) via the task
  service's status-transition path — one migration, backfill null.
- Aggregate in repository queries (`COUNT`, `SUM`), not by loading entities.
- Respect privacy: only shared events count toward shared time; private
  events are never exposed per member.
- Unit tests: window edges, reopened tasks, single-member lobby, non-member 403.

## Definition of done

Endpoint returns correct aggregates under test fixtures; task completion
timestamps persist; documented in `docs/api.md`; quality gates pass.
