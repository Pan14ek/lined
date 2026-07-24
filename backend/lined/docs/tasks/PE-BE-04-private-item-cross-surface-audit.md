# Task PE-BE-04 — Cross-Surface Privacy Audit

**Branch:** `feature/private-item-cross-surface-audit`

*Depends on PE-BE-02 (event visibility) and PE-BE-03 (task visibility).
Sweeps every surface that reads event/task data beyond the list/detail
endpoints those two tasks already fixed.*

## Detailed description

Visibility enforcement on list/detail/mutate endpoints is not sufficient by
itself — private content can leak through the ICS feed, dashboard
summaries, lobby statistics, search, product analytics, and logs. This task
is a dedicated sweep across every surface named in §3.3 and §22.1 of the
design doc, converting each into an explicit, requester-aware (or
owner-only) query/response, plus making imported calendar events private by
default.

## Design references

- §3.3 Cross-surface risk (the checklist this task closes)
- §16 ICS and external calendar integration
- §18 Dashboard, counters, statistics, and search
- §19 Product analytics
- §20 Future AI and recommendation boundary
- §21 Observability and audit
- §22.1 Threats addressed
- §23.7 Privacy regression test suite (this task's acceptance checklist)
- §25 Phase 4 (cross-feature audit) and Phase 5 (calendar-provider
  alignment) — both covered here since Phase 5 is a small, focused change
  that fits naturally alongside the ICS import work in this task

## Idea of this task

The earlier tasks make the *primary* read/write paths correct, but a
feature described this thoroughly in the design doc explicitly calls out
that privacy bugs hide in secondary surfaces — a dashboard summary query
written before visibility existed, a search index that scores before
filtering, an analytics event with a raw title in its properties. Auditing
these together, with the full checklist from §23.7 as the acceptance bar,
is safer than discovering each one individually in production.

## Development steps

1. **ICS import** (§16.1): update Google/Outlook/ICS import adapters so
   every imported event defaults to `EventVisibility.PRIVATE` unless the
   user has explicitly chosen another supported policy. Add a test
   asserting a freshly-imported event is `PRIVATE`.
2. **ICS export feed** (§16.2): confirm `findFeedEvents(userId)` (already
   updated in PE-BE-02, but re-verify here) returns the user's own private
   events + shared events visible to them, and never another member's
   private event. Add an explicit feed-token-holder test for this.
3. **Dashboard** (§18.1): audit dashboard summary queries; for the
   requester, include their own private upcoming events/tasks marked
   private; for another member's dashboard, exclude private details
   entirely.
4. **Counters** (§18.2): audit lobby task/event counters so a shared lobby
   counter is `all shared items + private items created by the requester`
   — per-requester, not a single lobby-wide number.
5. **Statistics** (§18.3): exclude private events and tasks from shared
   lobby statistics entirely for V1 (no owner-only personal statistics yet
   — that's a future extension per §28).
6. **Search** (§18.4): apply the visibility predicate in the search query
   itself, before text matching/scoring — never search all rows and filter
   after highlighting.
7. **Analytics** (§19): audit every analytics event emitted from event/task
   code paths; strip title, description, location, external provider name,
   ICS UID, and free-form notes from properties. Add/confirm the
   recommended bounded-label events: `event_created { visibility }`,
   `event_visibility_changed { from, to }`, `task_created { visibility }`,
   `task_visibility_changed { from, to }`, `private_item_access_denied
   { itemType }` (sampled, no item ID label).
8. **AI/recommendation context boundary** (§20): if any LLM/recommendation
   context builder currently touches event/task content, add an explicit
   exclusion so private items contribute only `{ startAt, endAt,
   availability: "BUSY" }`, never title/location/description. If no such
   builder exists yet, add a short guard/test as a placeholder contract for
   future AI features.
9. **Logs and metrics** (§21): audit logging around event/task access
   decisions; confirm no title/description/location/external UID is logged.
   Add the Micrometer counters `lined_private_item_created_total{item_type}`,
   `lined_private_item_access_denied_total{item_type}`,
   `lined_visibility_change_total{item_type,from,to}` with bounded labels
   only (no user/lobby/item IDs, no titles).
10. **Regression checklist** (§23.7): manually verify each item in the list
    (calendar list, calendar detail, event patch/delete, conflicts, free
    slots, task list, task detail, task patch/delete, dashboard,
    notifications, ICS, statistics, search, analytics payloads, AI context
    builder, logout cache clearing — the last one is UI-53's
    responsibility, confirm the backend contract it depends on is correct).
11. Tests, then `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- Imported external calendar events are `PRIVATE` by default.
- No surface in §3.3's list exposes another member's private event/task
  details: dashboard, counters, statistics, search, ICS feed, analytics,
  logs, or AI context.
- Analytics payloads and logs contain only bounded, non-content metadata for
  private items.
- New Micrometer counters exist with bounded labels.
- The §23.7 checklist passes end-to-end for both event and task privacy.

## REST API added / changed

No new public endpoints expected; this task mostly changes query/response
*contents* for existing dashboard/statistics/search endpoints and adds
internal analytics/metrics instrumentation. If any existing dashboard or
statistics endpoint requires a new query parameter to distinguish
requester-scoped counts, document it explicitly in the PR.

## Tests to add

- **Integration — ICS import**: imported event defaults to `PRIVATE`;
  explicit opt-in to `SHARED` is respected if supported.
- **Integration — ICS export**: A's feed contains A's private events +
  visible shared events, never B's private event.
- **Integration — dashboard**: A's dashboard includes A's private
  upcoming items; B's dashboard (same lobby) excludes them.
- **Integration — counters**: lobby task/event count differs correctly
  between A and B based on each one's private items.
- **Integration — statistics**: private items excluded from shared lobby
  statistics for both A and B.
- **Integration — search**: search results never include another member's
  private event/task title, even as a partial match.
- **Unit — analytics payload builder**: asserts no forbidden fields
  (title/description/location/ICS UID/notes) appear in emitted properties.
- **Unit — AI context builder** (if applicable): private event contributes
  only start/end/availability, never content fields.
- **Unit — metrics**: counters increment with only bounded labels, no
  ID-shaped label values.

## Risk & follow-ups

- This task is inherently broad; if any single surface (e.g. statistics)
  turns out to require a larger redesign than a query-predicate fix, split
  it into its own follow-up task rather than expanding this branch's scope
  — note the split in the PR description.
- A full business audit log (§21.3) is explicitly optional for V1 and out
  of scope here.
