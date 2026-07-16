# API Proposal — Dashboard Summary

**Branch:** `feature/dashboard-summary-api`
**Status:** Proposed
**Motivation:** README Phase 1 ("Personal dashboards — today / week view").
The web dashboard (UI task `lined-web/docs/tasks/UI-03-dashboard.md`)
currently needs 4+ requests per render: lobbies, events window, my tasks,
plus per-lobby free-slot probes — and still cannot show accurate per-lobby
counts without more fan-out.

## What the API should do

One aggregate, caller-scoped read:

```
GET /api/dashboard/summary?eventsUntil={timestamp}&freeSlotHorizon={timestamp}
→ 200 DashboardSummaryDto
```

```json
{
  "lobbies": [
    { "lobbyId": 101, "name": "Alex & Anastasiia", "lobbyType": "COUPLE",
      "memberCount": 2, "upcomingEventCount": 3, "openTaskCount": 5 }
  ],
  "upcomingEvents": [ /* next N EventDto across all lobbies, ascending */ ],
  "myTasks":        [ /* open TaskDto assigned to the caller, due-date ascending */ ],
  "nextFreeSlot":   { "lobbyId": 101, "start": "2026-07-19T14:00:00Z", "end": "2026-07-19T17:00:00Z" },
  "unreadNotificationCount": 4
}
```

- `lobbies`: every lobby the caller belongs to, with member count, count of
  upcoming events (now → `eventsUntil`), and open (non-DONE) task count.
- `upcomingEvents`: capped (e.g. 5) and only events visible to the caller.
- `myTasks`: capped (e.g. 5) open tasks assigned to the caller.
- `nextFreeSlot`: earliest common free slot (reusing the free-slot service)
  across the caller's lobbies within `freeSlotHorizon`; `null` when none.
- `unreadNotificationCount`: unread inbox records.

**Errors:** `400` for an invalid time window. Empty collections (not errors)
for a user with no lobbies.

## Why it matters

- Dashboard renders with one round-trip; counts become accurate instead of
  the current "derived from whatever was already fetched" approximation.
- The free-slot banner (the product's signature feature) gets server-computed
  data on the landing page, consistent with `GET /api/lobbies/{id}/free-slots`.

## Implementation notes

- New `dashboard` module: thin controller + application service composing
  the existing lobby, event, task, free-slot, and notification services —
  no new repositories; no cross-layer shortcuts.
- Cap and document the `N` limits; keep the DTO a Java record
  (`DashboardSummaryDto`).
- Unit tests per composition rule (counts, caps, no-lobby user, private-event
  visibility).

## Definition of done

The web dashboard can render entirely from this endpoint (plus lazy detail
queries); response documented in `docs/api.md`; quality gates pass.
