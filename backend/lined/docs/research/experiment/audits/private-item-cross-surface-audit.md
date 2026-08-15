# Private-Item Cross-Surface Audit

Audit date: 2026-08-15. Scope is the checked-out backend source, its Spring
controllers, repository queries, configuration, and automated tests. This audit
does not infer behavior for proposal-only or absent backend systems.

## Result

The implemented event/task surfaces are private-safe for the cross-surface
risks that currently exist in the backend. ICS import now explicitly writes
`EventVisibility.PRIVATE` and `shared=false`; personal feed queries return the
owner's private events and lobby-shared events, never another member's private
event. New operational counters use only fixed visibility and item-type labels.

## Surface inventory

| Surface | Source evidence | Verdict |
|---|---|---|
| ICS import | `CalendarIcsServiceImpl` writes `PRIVATE` and `shared=false` during UID-based upsert. | Implemented and covered by unit and HTTP integration tests. |
| ICS export | `EventRepository.findFeedEvents` selects owner events plus member-visible shared events. | Implemented and covered by repository and token-feed integration tests. |
| Dashboard | Only `docs/product/dashboard/proposals/dashboard-summary-api.md` exists; no dashboard controller, service, or module exists. | Not applicable; no system was introduced. |
| Lobby counters | No event/task counter endpoint or aggregation query exists. | Not applicable; no system was introduced. |
| Statistics | No event/task statistics endpoint, repository query, or service exists. | Not applicable; no system was introduced. |
| Event/task search | User search exists, but there is no event/task search controller, repository, or index. | Not applicable; no system was introduced. |
| Product analytics | No analytics emitter, queue, or provider adapter reads event/task content. | Not applicable; no system was introduced. |
| AI or recommendations | No LLM context builder or recommendation module reads event/task content. | Not applicable; no system was introduced. |
| Logs and traces | Event/task services do not log private item fields; no logging adapter reads their title, description, location, or ICS UID. | Confirmed safe for current source. |
| Metrics | `PrivateItemMetrics` emits item type and visibility enum values only. | Implemented with bounded labels. |
| Client cache clearing | UI-53 owns logout/account-switch cache clearing; the backend has no response cache or client-state store. | Backend contract unchanged. |

## Metrics contract

Micrometer source meters use lowercase dot notation. The existing Prometheus
registry normalizes them into these externally visible counter series:

| Prometheus series | Labels | Bounded values |
|---|---|---|
| `lined_private_item_created_total` | `item_type` | `event`, `task` |
| `lined_private_item_access_denied_total` | `item_type` | `event`, `task` |
| `lined_visibility_change_total` | `item_type`, `from`, `to` | `event`/`task`, `PRIVATE`/`SHARED` |

No user, lobby, item, token, path, title, description, location, provider, or
ICS UID is a metric label. A denied private direct read still returns the same
normal `404` as an unknown resource.

## Regression evidence

- Unit tests prove imported enum visibility, private creates, real visibility
  changes, bounded metric labels, and unchanged `404` behavior on denial.
- Repository tests prove the feed visibility predicate.
- HTTP integration tests cover raw ICS import persistence and a token holder's
  feed excluding another member's private event.
- Existing privacy enforcement remains responsible for list/detail, mutation,
  conflict, free-slot, and notification response behavior.
