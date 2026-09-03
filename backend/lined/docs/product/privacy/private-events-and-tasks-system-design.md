# Private Events and Tasks — System Design

**Status:** Proposed  
**Scope:** Backend API, PostgreSQL persistence, Web UI, notifications, calendar availability, analytics, and future AI integrations  
**Repository:** `Pan14ek/lined`  
**Last updated:** 2026-07-25  
**Suggested document path:** `backend/lined/docs/product/privacy/private-events-and-tasks-system-design.md`

---

## 1. Executive summary

Lined is a shared planning product, but a shared lobby must not imply that every event
and task is visible to every lobby member.

A user may need to:

- buy or prepare a gift;
- reserve a restaurant for a surprise;
- collect an order without revealing its location;
- prepare a private checklist for a shared event;
- add a medical, therapy, financial, or work appointment;
- import an external calendar as busy time without exposing event details;
- create personal tasks that still belong to the context of a couple or family lobby.

This design introduces explicit `PRIVATE` and `SHARED` visibility for events and tasks.

The core privacy rule is:

> Private item details are visible only to the item owner, while a private event still
> blocks the owner's availability during free-slot calculation.

This is both a product feature and a security boundary. The backend is authoritative.
The web client may hide private data, but no privacy rule may depend only on UI filtering.

---

## 2. Product problem

### 2.1 Current user problem

A couple uses one lobby to coordinate shared time. One partner wants to prepare a
birthday surprise and creates:

- an event: `Pick up the gift`;
- a task: `Order flowers`;
- another task: `Book the restaurant`.

If these items are shared, the surprise is revealed. If the user keeps them outside
Lined, the application no longer has a complete view of that person's availability
and preparation work.

Lined therefore needs to support both:

1. shared coordination;
2. private planning inside the same relationship context.

### 2.2 Primary use cases

#### Surprise preparation

A user creates private tasks and events related to a gift, date, trip, or celebration.
The other lobby member receives no notification and cannot discover the item through
calendar, task, search, dashboard, statistics, or direct API access.

#### Personal busy time

A private appointment blocks the owner's availability. Other members cannot see its
title, location, description, source, or external identifier.

#### External calendar import

Imported work and personal calendar events are private by default. They improve
free-slot accuracy without exposing external calendar details.

#### Private preparation for a shared event

A shared birthday event may have private preparation tasks owned by one partner.

---

## 3. Existing implementation and identified gaps

This section describes the current repository state that the implementation must
migrate from.

### 3.1 Events

`EventEntity` currently contains:

```java
private boolean shared;
```

`EventCreateDto`, `EventUpdateDto`, and `EventDto` expose the same concept as
`shared: boolean`.

The event list currently queries all overlapping events in a lobby and maps all of
them to `EventDto`. Update and delete currently verify lobby membership but do not
require ownership for an event where `shared == false`.

Therefore, `shared=false` currently expresses intent but does not provide complete
confidentiality.

The event repository already contains useful foundations:

- private events owned by a user can block that user's free time;
- shared events can block all relevant lobby members;
- personal ICS feeds can include the feed owner's private events while excluding
  another member's private events;
- imported ICS events have an external UID foundation.

These existing behaviors must be preserved and covered by explicit privacy tests.

### 3.2 Tasks

`TaskEntity` currently has creator, assignee, lobby, title, description, priority,
status, and due date, but no visibility property.

Task list queries do not have a requester-aware privacy filter. A private-task
capability therefore requires a new domain field, repository filters, access policy,
DTO changes, UI controls, and notification rules.

### 3.3 Cross-surface risk

Private information can leak through more than a normal list endpoint. The design must
cover:

- direct item access;
- update and delete;
- calendar conflict responses;
- free-slot calculations;
- task and event counters;
- dashboard summaries;
- notification records and external delivery;
- ICS feeds and imports;
- search;
- lobby statistics;
- product analytics;
- logs and traces;
- future LLM prompts and recommendation context;
- frontend query caches after logout or account switching.

---

## 4. Goals

1. Support `PRIVATE` and `SHARED` visibility for events and tasks.
2. Guarantee that private details are returned only to the item owner.
3. Keep private events in the owner's busy-time calculation.
4. Prevent notifications about private items from reaching other lobby members.
5. Make imported external events private by default.
6. Preserve current shared-item behavior unless this document explicitly changes it.
7. Enforce privacy in repository/service code, not only in the frontend.
8. Prevent existence disclosure through direct resource access where practical.
9. Make the design compatible with future calendar sync, reminders, analytics, and AI.
10. Provide a safe migration path from the existing event `shared` boolean.

---

## 5. Non-goals

Version 1 does not include:

- visibility for selected lobby members;
- hiding an event's busy-time effect from free-slot calculation;
- encrypted event or task content at rest;
- device-level privacy or application PIN protection;
- end-to-end encrypted synchronization;
- anonymous shared items;
- secret collaboration between several members against another member;
- delayed reveal or automatic reveal dates;
- private comments or attachments;
- recurring-event redesign;
- a separate `Surprise Plan` aggregate;
- AI access to private item details by default.

Possible future values such as `SELECTED_MEMBERS` or `SECRET_FROM_MEMBERS` must not be
implemented prematurely.

---

## 6. Terminology

### Owner

For an event, the owner is `EventEntity.owner`.

For a task, the private-item owner is `TaskEntity.creator`. A private task is always
owned by its creator.

### Visibility

```text
PRIVATE
SHARED
```

`PRIVATE` means only the owner may receive the item's details.

`SHARED` means the item is visible under the existing lobby access rules.

### Details

Private details include, at minimum:

- title;
- description;
- location;
- category;
- source;
- external provider identifiers;
- notes;
- attachment metadata;
- reminder text;
- analytics properties derived from content.

### Availability exposure

A private event affects the owner's availability. Another user may infer that the
owner is unavailable for a period through free-slot results, but must not receive the
event details.

This indirect availability signal is expected product behavior, not a privacy breach.

---

## 7. Core design decisions

### 7.1 Use an enum instead of a boolean

The API and domain model use explicit visibility values:

```java
public enum EventVisibility {
  PRIVATE,
  SHARED
}
```

```java
public enum TaskVisibility {
  PRIVATE,
  SHARED
}
```

Separate module-specific enums are preferred over one shared domain enum. Event and
task visibility may evolve independently while serializing to the same API strings.

### 7.2 Default visibility is `SHARED`

Existing application behavior must remain unchanged for old clients and existing data.

New create forms select `SHARED` by default. The UI must still clearly display the
choice rather than silently assuming that the user understands it.

### 7.3 Private events remain associated with a lobby

A private event still has `lobby_id`.

The lobby provides:

- product context;
- membership validation during creation;
- free-slot participation;
- calendar organization;
- future relationship-specific recommendations.

Lobby membership does not grant access to private event details.

### 7.4 Private tasks are self-owned

A private task:

- is visible only to its creator;
- is assigned to its creator;
- cannot be assigned to another user;
- cannot emit an assignment notification to another user.

On private-task creation:

- omitted `assigneeId` is normalized to the creator;
- `assigneeId == creatorId` is accepted;
- another user's `assigneeId` is rejected.

### 7.5 Unauthorized private resources behave as not found

A lobby member who requests another member's private item by ID receives `404`, not
an item-specific `403`.

This prevents the API from confirming that a guessed private resource exists.

The normal non-member behavior for public lobby operations may continue to use the
existing lobby access policy.

### 7.6 Visibility changes are owner-only

Only the item owner may change visibility.

This prevents another lobby member from:

- turning someone else's private item into a shared item;
- hiding a shared item by converting it to private.

### 7.7 Shared-to-private is not retroactive secrecy

A user may convert their own shared item to private, but the application cannot make
other members forget details they already saw.

The UI must show a warning:

> Making this private removes it from other members' views, but anyone who already saw
> it may remember its details.

### 7.8 No dedicated feature flag

Event privacy enforcement is a security correction for an already exposed
`shared=false` concept and must not be disableable.

Private event UI remains under `calendars.feature.enabled`.

Private task UI remains under `tasks.feature.enabled`.

---

## 8. Authorization model

### 8.1 Event access matrix

| Operation | Event owner | Other lobby member | Non-member |
|---|---:|---:|---:|
| Create private event | Allow | Allow for their own new event | Deny |
| Read own private event | Allow | — | — |
| Read another member's private event | — | Not returned / `404` | `404` or existing membership denial |
| Update private event | Allow | `404` | `404` |
| Delete private event | Allow | `404` | `404` |
| Change private to shared | Allow | `404` | `404` |
| Change shared to private | Owner only | Deny | Deny |
| Read shared event | Existing lobby rule | Existing lobby rule | Deny |
| Update/delete shared event | Existing lobby rule | Existing lobby rule | Deny |
| Include private event in owner's busy time | Yes | Used only as opaque busy interval | No details |
| Send member notification for private event | Owner-only reminder at most | Never | Never |
| Export through owner's ICS feed | Allow | Never in another member's feed | Never |

### 8.2 Task access matrix

| Operation | Task creator | Other lobby member | Non-member |
|---|---:|---:|---:|
| Create private task | Allow | Allow for their own new task | Deny |
| Read own private task | Allow | — | — |
| Read another member's private task | — | Not returned / `404` | `404` |
| Update private task | Allow | `404` | `404` |
| Delete private task | Allow | `404` | `404` |
| Change private to shared | Allow | `404` | `404` |
| Change shared to private | Creator only | Deny | Deny |
| Assign private task to creator | Allow | — | — |
| Assign private task to another user | Reject | Reject | Reject |
| Emit assignment notification | No cross-user notification | Never | Never |
| Include in lobby task statistics | Owner-visible private statistics only | Exclude | Exclude |

---

## 9. Domain model

### 9.1 Event entity

Target model:

```java
@Enumerated(EnumType.STRING)
@Column(nullable = false, length = 16)
private EventVisibility visibility;
```

The existing `shared` field is replaced after the compatibility period.

Relevant event fields:

```text
id
version
title
location
visibility
startAt
endAt
timezone
icsUid
lobby
owner
createdAt
```

### 9.2 Task entity

Target model:

```java
@Enumerated(EnumType.STRING)
@Column(nullable = false, length = 16)
private TaskVisibility visibility;
```

Relevant task fields:

```text
id
version
title
description
priority
status
visibility
lobby
creator
assignee
dueDate
createdAt
```

### 9.3 Invariants

#### Event invariants

```text
visibility is never null
owner must be a member of the event lobby at creation time
PRIVATE event details are owner-only
PRIVATE event may not notify lobby members
PRIVATE event still blocks owner availability
visibility changes require owner identity
```

#### Task invariants

```text
visibility is never null
creator must be a member of the task lobby at creation time
PRIVATE task details are creator-only
PRIVATE task assignee must equal creator
PRIVATE task may not notify another user
visibility changes require creator identity
```

---

## 10. Database design and migration

### 10.1 Target columns

```sql
ALTER TABLE events
  ADD COLUMN visibility VARCHAR(16);

UPDATE events
SET visibility = CASE
  WHEN shared = TRUE THEN 'SHARED'
  ELSE 'PRIVATE'
END;

ALTER TABLE events
  ALTER COLUMN visibility SET NOT NULL;

ALTER TABLE events
  ALTER COLUMN visibility SET DEFAULT 'SHARED';

ALTER TABLE tasks
  ADD COLUMN visibility VARCHAR(16) NOT NULL DEFAULT 'SHARED';
```

Recommended constraints:

```sql
ALTER TABLE events
  ADD CONSTRAINT chk_events_visibility
  CHECK (visibility IN ('PRIVATE', 'SHARED'));

ALTER TABLE tasks
  ADD CONSTRAINT chk_tasks_visibility
  CHECK (visibility IN ('PRIVATE', 'SHARED'));
```

### 10.2 Indexes

Candidate indexes must be verified with actual query plans:

```sql
CREATE INDEX idx_events_lobby_visibility_owner_time
  ON events (lobby_id, visibility, owner_id, start_at, end_at);

CREATE INDEX idx_tasks_lobby_visibility_creator
  ON tasks (lobby_id, visibility, creator_id);
```

Do not add indexes without checking existing indexes and query plans.

### 10.3 Compatibility migration

The safest event migration has two releases.

#### Release A

- add `visibility`;
- backfill from `shared`;
- write both `visibility` and `shared`;
- read primarily from `visibility`;
- expose new API field;
- migrate web and tests.

#### Release B

- stop exposing legacy `shared`;
- remove dual-write code;
- drop `shared` after confirming no active client depends on it.

For a pre-production environment with disposable data, the project may perform a
coordinated backend/web breaking change in one release. Production data must use the
two-step path.

### 10.4 Current schema-management limitation

The repository currently uses `schema.sql` with JPA schema updates. For any deployed
environment containing user data, this feature requires an explicit, versioned
migration rather than relying on automatic schema inference.

Before public beta, adopting Flyway or Liquibase remains recommended. This feature
must not silently reinterpret existing `shared=false` rows.

---

## 11. Backend architecture

### 11.1 New classes

Suggested backend structure:

```text
event/
  domain/
    EventVisibility.java
  service/
    EventAccessPolicy.java

task/
  domain/
    TaskVisibility.java
  service/
    TaskAccessPolicy.java
```

### 11.2 EventAccessPolicy

```java
public interface EventAccessPolicy {

  void ensureCanRead(EventEntity event, Long requesterId);

  void ensureCanMutate(EventEntity event, Long requesterId);

  void ensureCanChangeVisibility(EventEntity event, Long requesterId);

  boolean isVisibleTo(EventEntity event, Long requesterId);
}
```

Rules:

```text
PRIVATE + requester is owner -> allow
PRIVATE + requester is not owner -> throw NotFoundException
SHARED + requester is lobby member -> preserve existing behavior
visibility change -> owner only
```

### 11.3 TaskAccessPolicy

```java
public interface TaskAccessPolicy {

  void ensureCanRead(TaskEntity task, Long requesterId);

  void ensureCanMutate(TaskEntity task, Long requesterId);

  void ensureCanChangeVisibility(TaskEntity task, Long requesterId);

  boolean isVisibleTo(TaskEntity task, Long requesterId);
}
```

### 11.4 Repository-first filtering

Privacy filtering must occur in database queries where possible.

Do not load all lobby items and filter private records in Java. Repository-level
filtering:

- reduces accidental exposure;
- prevents future mapper/logging leaks;
- lowers memory usage;
- makes pagination counts correct;
- avoids hidden items affecting visible counters.

Example event visibility predicate:

```sql
event.lobby_id = :lobbyId
AND event.start_at < :to
AND event.end_at > :from
AND (
  event.visibility = 'SHARED'
  OR event.owner_id = :requesterId
)
```

Example task visibility predicate:

```sql
task.lobby_id = :lobbyId
AND (
  task.visibility = 'SHARED'
  OR task.creator_id = :requesterId
)
```

### 11.5 Event repository methods

Suggested methods:

```java
List<EventEntity> findVisibleOverlapping(
    Long lobbyId,
    Long requesterId,
    OffsetDateTime from,
    OffsetDateTime to);

Optional<EventEntity> findVisibleById(
    Long eventId,
    Long requesterId);
```

`findBusyForMemberIds` must retain its current semantic intent:

- every private event blocks its owner;
- a shared event blocks relevant lobby members;
- no private DTO is returned to other users.

`findFeedEvents(userId)` must continue returning:

- the user's private events;
- shared events visible to the user;
- never another user's private event.

### 11.6 Task repository methods

Suggested methods:

```java
List<TaskEntity> findVisibleByLobby(
    Long lobbyId,
    Long requesterId,
    TaskFilters filters);

List<TaskEntity> findVisibleMine(
    Long requesterId,
    TaskFilters filters);

Optional<TaskEntity> findVisibleById(
    Long taskId,
    Long requesterId);
```

`GET /api/tasks/mine` must never mean "all tasks from all lobbies the user belongs to"
when private tasks exist.

Recommended semantic:

```text
shared tasks assigned to the requester
+
private tasks created by the requester
```

Any broader existing behavior should be documented separately and must still exclude
another creator's private tasks.

---

## 12. REST API design

### 12.1 Event create

```http
POST /api/calendar/events
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "title": "Pick up the gift",
  "location": "Parcel locker",
  "visibility": "PRIVATE",
  "startAt": "2026-08-01T16:00:00+03:00",
  "endAt": "2026-08-01T17:00:00+03:00",
  "timezone": "Europe/Kyiv",
  "lobbyId": 101,
  "notifyMembers": false
}
```

Response:

```json
{
  "id": 9001,
  "version": 0,
  "title": "Pick up the gift",
  "location": "Parcel locker",
  "visibility": "PRIVATE",
  "startAt": "2026-08-01T16:00:00+03:00",
  "endAt": "2026-08-01T17:00:00+03:00",
  "timezone": "Europe/Kyiv",
  "lobbyId": 101,
  "ownerId": 42,
  "createdAt": "2026-07-25T10:00:00Z"
}
```

Validation:

```text
PRIVATE + notifyMembers=true -> 400
unknown visibility -> 400
creator is not a lobby member -> existing membership error
```

### 12.2 Event update

```http
PATCH /api/calendar/events/9001
Authorization: Bearer <accessToken>
If-Match: "0"
```

```json
{
  "visibility": "SHARED"
}
```

Only the event owner may change `visibility`.

Optimistic-lock behavior remains unchanged.

### 12.3 Event list

```http
GET /api/calendar/events?lobbyId=101&from=...&to=...
```

Response semantics:

```text
all SHARED events visible to the requester
+
requester's own PRIVATE events
```

Another member's private event is absent. No placeholder event is returned.

### 12.4 Task create

```http
POST /api/tasks
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "title": "Order flowers",
  "lobbyId": 101,
  "assigneeId": 42,
  "dueDate": "2026-08-01",
  "description": "Choose delivery for the evening",
  "priority": "HIGH",
  "status": "TODO",
  "visibility": "PRIVATE",
  "notifyAssignee": false
}
```

Normalization:

```text
PRIVATE + assigneeId omitted -> assignee becomes creator
PRIVATE + assigneeId equals creator -> accepted
PRIVATE + assigneeId belongs to another user -> 400
PRIVATE + notifyAssignee=true -> 400 or normalized to false
```

Rejecting the invalid combination is preferred because it exposes client defects.

### 12.5 Task update

```http
PATCH /api/tasks/555
Authorization: Bearer <accessToken>
If-Match: "0"
```

```json
{
  "visibility": "PRIVATE",
  "assigneeId": 42
}
```

If a shared task is currently assigned to another user, conversion to `PRIVATE`
requires an explicit reassignment to the creator in the same request. Otherwise the
request fails.

### 12.6 Backward-compatible event API

During the transition, the event API may accept both:

```json
{
  "shared": false
}
```

and:

```json
{
  "visibility": "PRIVATE"
}
```

Rules:

```text
only visibility present -> use visibility
only shared present -> map true to SHARED, false to PRIVATE
both present and equivalent -> accept
both present and contradictory -> 400
```

Responses may temporarily include both fields with `shared` marked deprecated in
OpenAPI.

The task API has no legacy field and uses only `visibility`.

---

## 13. Error model

All errors continue using RFC 7807 `ProblemDetail`.

### Invalid private task assignee

```json
{
  "type": "https://errors.lined.app/private-task-assignee-invalid",
  "title": "Bad Request",
  "status": 400,
  "detail": "A private task can only be assigned to its creator",
  "code": "private_task.assignee_invalid"
}
```

### Invalid private notification request

```json
{
  "type": "https://errors.lined.app/private-item-notification-invalid",
  "title": "Bad Request",
  "status": 400,
  "detail": "Private items cannot notify other lobby members",
  "code": "private_item.notification_invalid"
}
```

### Unauthorized private resource

Return the same normal `404` shape used for an unknown event or task. Do not return a
message such as "This event is private."

### Visibility transition denied

If a visible shared item exists but a non-owner attempts to change its visibility,
return `403`.

---

## 14. Calendar and free-slot behavior

### 14.1 Free-slot invariant

For every lobby member:

```text
busy intervals =
  their own PRIVATE events
  +
  SHARED events that block that member
  +
  private imported external busy events owned by that member
```

The free-slot response contains available intervals only. It does not identify which
private event caused a period to be unavailable.

### 14.2 Conflict endpoint privacy

The current conflict response contains two full `EventDto` objects. This can leak
private titles and locations when the conflict search operates over all lobby events.

The conflict API must be redesigned before private events are considered complete.

Recommended response:

```json
{
  "first": {
    "eventId": 9001,
    "ownerId": 42,
    "visibility": "PRIVATE",
    "detailsAvailable": true,
    "event": {
      "title": "Pick up the gift"
    }
  },
  "second": {
    "eventId": null,
    "ownerId": 77,
    "visibility": "PRIVATE",
    "detailsAvailable": false,
    "event": null
  },
  "overlapStart": "2026-08-01T16:30:00+03:00",
  "overlapEnd": "2026-08-01T17:00:00+03:00"
}
```

However, exposing another user's private event ID is unnecessary. The preferred
sanitized representation for a non-owner is:

```json
{
  "ownerId": 77,
  "visibility": "PRIVATE",
  "detailsAvailable": false
}
```

A simpler alternative is to replace event-pair conflicts with per-member
availability conflicts. The final API shape should optimize for the actual UI need
and must not expose another member's private event ID.

### 14.3 Personal conflict endpoint

A user may inspect the details of their own private conflict.

A user must not use a requester parameter to inspect another person's private
calendar. The authenticated principal remains authoritative.

---

## 15. Notifications and reminders

### 15.1 Member notifications

Private items never produce:

- shared event created notifications;
- task assigned notifications for another member;
- lobby-wide update notifications;
- lobby activity feed entries visible to others.

### 15.2 Owner reminders

A future reminder scheduler may notify the private-item owner.

For in-app delivery, the owner may see the private title.

For email, push, or lock-screen delivery, privacy-aware copy is recommended:

```text
You have a private event in 30 minutes.
```

The user may opt into displaying private titles in external notifications through a
future setting. Default external delivery must be conservative.

### 15.3 Visibility transitions

`PRIVATE -> SHARED` does not automatically notify members unless the request contains
an explicit supported notification option.

`SHARED -> PRIVATE` removes the item from future member responses but does not send a
notification explaining that a private item exists.

---

## 16. ICS and external calendar integration

### 16.1 Import

Imported external events are `PRIVATE` by default.

```text
external calendar event
-> private Lined event
-> blocks owner availability
-> details visible only to owner
```

An explicit user action may later convert an imported event to `SHARED`, subject to
provider-sync rules.

### 16.2 Export feed

A user's personal ICS feed contains:

- the user's private Lined events;
- shared events visible to the user;
- no private event owned by another lobby member.

The secret feed URL itself is sensitive. This feature does not change feed-token
security requirements.

### 16.3 OAuth sync

Google and Outlook provider adapters must map imported events to `PRIVATE` unless the
user explicitly chooses another supported policy.

OAuth scopes and provider tokens must never be exposed through event DTOs, analytics,
or logs.

---

## 17. Web UI design

### 17.1 Event form

Add a visibility control:

```text
Visibility

[ Shared with lobby ]  [ Private ]

Shared:
Everyone in this lobby can see the event.

Private:
Only you can see the event details. It still blocks your availability
when Lined searches for shared free time.
```

Behavior:

- default `SHARED`;
- selecting `PRIVATE` disables `Notify members`;
- if `Notify members` was enabled, reset it to false;
- show a lock icon in the owner-visible calendar item;
- preserve visibility during edit;
- only owner sees the visibility edit control;
- shared-to-private shows the non-retroactive secrecy warning.

### 17.2 Task form

Add the same visibility control.

When `PRIVATE` is selected:

- set assignee to the current user;
- disable the assignee picker;
- hide or disable `Notify assignee`;
- display: `Only you can see this task`;
- retain lobby selection because the lobby remains the task context.

### 17.3 Calendar rendering

Owner view:

```text
🔒 Pick up the gift
```

Other member view:

```text
No event card, title, tooltip, DOM node, or hidden accessible text.
```

The other member may still see that no common free slot exists during the interval.

### 17.4 Task rendering

Owner view:

```text
🔒 Order flowers
```

Other member view:

```text
No task card, count contribution, search result, notification, or placeholder.
```

### 17.5 Filters

Private/shared filters are optional for the first release.

If introduced:

```text
All visible
Shared
Private
```

`Private` always means the requester's private items, never all private lobby items.

### 17.6 Cache and logout safety

On logout or account switching:

- clear TanStack Query cache;
- clear feature-specific in-memory stores;
- do not persist event/task response bodies to local storage;
- remove private item details from browser-visible state;
- avoid private titles in URLs and document titles.

A shared physical device remains outside complete application control. A future app
lock may address that separately.

### 17.7 Accessibility and localization

- visibility controls must be keyboard accessible;
- lock icons need accessible labels;
- do not rely only on color;
- privacy explanation must be available to screen readers;
- add all copy to i18n catalogs;
- use concise, non-technical wording.

---

## 18. Dashboard, counters, statistics, and search

### 18.1 Dashboard

For the requester:

- include their own private upcoming events;
- include their own private tasks where appropriate;
- mark them private.

For another member:

- exclude private details completely.

### 18.2 Counters

Shared lobby counters must exclude other members' private items.

Examples:

```text
Lobby task count visible to user A =
  all shared lobby tasks
  +
  private tasks created by A
```

The count visible to user B may differ. This is expected.

### 18.3 Statistics

V1 excludes private events and tasks from shared lobby statistics.

Owner-only personal statistics may include private items later.

### 18.4 Search

Search must apply visibility constraints in the query before text matching.

Never search all rows and filter private results after highlighting or scoring.

---

## 19. Product analytics

Analytics may record low-sensitivity metadata:

```json
{
  "eventName": "event_created",
  "properties": {
    "visibility": "PRIVATE",
    "source": "calendar_form",
    "hasLocation": true,
    "durationMinutes": 60
  }
}
```

Analytics must not include:

- private title;
- private description;
- private location;
- exact external provider event name;
- gift or surprise category inferred from text;
- OAuth tokens;
- ICS UID;
- exact free-form notes.

Recommended events:

```text
event_created { visibility }
event_visibility_changed { from, to }
task_created { visibility }
task_visibility_changed { from, to }
private_item_access_denied { itemType }  // sampled, no item ID label in metrics
```

Metrics must use bounded labels only.

---

## 20. Future AI and recommendation boundary

Private content is excluded from LLM context by default.

### 20.1 Allowed default AI context

A private event may contribute only:

```json
{
  "startAt": "2026-08-01T16:00:00+03:00",
  "endAt": "2026-08-01T17:00:00+03:00",
  "availability": "BUSY"
}
```

It must not contribute:

```json
{
  "title": "Buy engagement ring",
  "location": "Jewelry store",
  "description": "Ask for the reserved model"
}
```

### 20.2 Explicit private-item AI consent

A future feature may allow:

> Use AI to help with this private plan.

This requires explicit item-level or session-level consent and must be separate from
general recommendation personalization.

### 20.3 Prompt logging

Private raw content must not be written to normal application logs, traces, analytics,
or evaluation datasets.

---

## 21. Observability and audit

### 21.1 Logs

Log:

- access decision type;
- item type;
- visibility;
- requester/owner relationship as a bounded category;
- request correlation ID.

Do not log:

- title;
- description;
- location;
- external UID;
- gift/surprise content.

### 21.2 Metrics

Suggested Micrometer counters:

```text
lined_private_item_created_total{item_type}
lined_private_item_access_denied_total{item_type}
lined_visibility_change_total{item_type,from,to}
```

Do not use user IDs, lobby IDs, item IDs, paths, or titles as metric labels.

### 21.3 Audit log

A complete business audit log is optional for V1.

If added later, visibility changes are useful audit events, but private content should
not be duplicated into the audit table.

---

## 22. Security and privacy threat model

### 22.1 Threats addressed

- another lobby member lists a private item;
- another member guesses an item ID;
- another member patches or deletes a private item;
- conflict API returns private DTOs;
- dashboard or statistics reveal private titles;
- notification reveals a surprise;
- external calendar feed includes someone else's private event;
- analytics records private content;
- AI prompt receives private text;
- frontend cache shows previous user's private data after logout.

### 22.2 Threats not fully addressed

- another person uses the owner's unlocked device;
- screenshots;
- browser extensions;
- compromised owner account;
- a user seeing an item before it is changed from shared to private;
- inference from availability patterns;
- server administrator access without application-layer encryption.

---

## 23. Testing strategy

### 23.1 Test identities

Every privacy integration test should use:

```text
User A — item owner
User B — another member of the same lobby
User C — non-member
```

### 23.2 Event service tests

Required cases:

- A creates private event;
- A sees private event in list;
- B does not see A's private event in list;
- C cannot access lobby event list;
- B cannot update A's private event;
- B cannot delete A's private event;
- B receives `404` for direct private access;
- A can update and delete own private event;
- only A can change its visibility;
- private event with `notifyMembers=true` is rejected;
- no member notification is emitted;
- private event blocks A's availability;
- B's private event blocks B's availability;
- private event does not appear in another member's feed;
- owner feed contains owner's private event;
- visibility update respects `If-Match`;
- stale update returns existing optimistic-lock error.

### 23.3 Conflict tests

- requester sees details for own private event;
- requester never sees another member's private details;
- private conflict does not expose private event ID unless explicitly required;
- overlap calculation remains correct after sanitization.

### 23.4 Task service tests

- A creates private task with no assignee and becomes assignee;
- private task assigned to A is accepted;
- private task assigned to B is rejected;
- B does not see A's private task in lobby list;
- B does not see A's private task in global task view;
- B cannot update or delete A's private task;
- A can update and delete it;
- only A can change visibility;
- converting shared task assigned to B into private without reassignment is rejected;
- no task-assigned notification is emitted for private task.

### 23.5 Repository tests

Use database-backed tests for visibility predicates:

- SHARED item returned to members;
- PRIVATE item returned only to owner/creator;
- pagination totals reflect visible rows;
- search and filters never return hidden rows;
- free-slot query includes private busy rows without returning them through list queries.

### 23.6 Web tests

Using MSW and Testing Library:

- default visibility is shared;
- private selection shows explanation;
- private event disables member notifications;
- private task locks assignee to current user;
- lock indicator is accessible;
- another user fixture never renders private content;
- visibility change invalidates relevant queries;
- logout clears cached private items;
- shared-to-private warning appears;
- server `404` for private resource uses normal not-found state.

### 23.7 Privacy regression test suite

Create a dedicated cross-feature test checklist covering:

```text
calendar list
calendar detail
event patch/delete
conflicts
free slots
task list
task detail
task patch/delete
dashboard
notifications
ICS
statistics
search
analytics payloads
AI context builder
logout cache clearing
```

---

## 24. Performance considerations

Repository-level visibility predicates add owner/creator conditions to common reads.

Validate:

- calendar range-query execution plans;
- task list query plans;
- free-slot query performance;
- pagination count queries;
- ICS feed query performance.

Avoid N+1 access-policy checks by fetching required lobby and owner identifiers with
the query or an appropriate entity graph.

Privacy correctness takes precedence over micro-optimization.

---

## 25. Rollout plan

### Phase 0 — Immediate event privacy correction

Treat the existing `shared=false` gap as a bug.

Deliver:

- requester-aware event list;
- owner-only private update/delete;
- visibility-change owner check;
- notification suppression;
- conflict sanitization;
- regression tests.

This phase should not wait for private tasks or UI redesign.

### Phase 1 — Visibility persistence and API migration

Deliver:

- event visibility enum;
- task visibility enum;
- database migration;
- DTO/OpenAPI changes;
- backward-compatible event field handling if required.

### Phase 2 — Private tasks backend

Deliver:

- task access policy;
- repository filters;
- self-assignment invariant;
- notification rules;
- tests.

### Phase 3 — Web UI

Deliver:

- event visibility selector;
- task visibility selector;
- lock indicators;
- explanations;
- transition warning;
- query invalidation and cache clearing;
- i18n and accessibility.

### Phase 4 — Cross-feature privacy audit

Audit and fix:

- dashboard;
- counters;
- search;
- statistics;
- notifications;
- ICS;
- analytics;
- future AI context seams.

### Phase 5 — Calendar-provider alignment

Ensure Google/Outlook/ICS imported events use private visibility by default and
continue to block availability.

---

## 26. Suggested implementation tasks and branches

### Backend

#### `bug/private-event-access-enforcement`

- enforce owner-only private event access;
- filter event list by requester;
- sanitize conflict results;
- suppress member notifications;
- add security regression tests.

#### `feature/event-visibility-model`

- add `EventVisibility`;
- migrate `shared` to `visibility`;
- update DTOs, mapper, OpenAPI, repository queries, and compatibility layer.

#### `feature/private-tasks`

- add `TaskVisibility`;
- add task access policy;
- add self-assignment rules;
- update repositories, services, DTOs, mappers, and tests.

#### `feature/private-item-cross-surface-audit`

- dashboard;
- counters;
- notification queries;
- ICS;
- search;
- statistics;
- analytics seams.

### Web

#### `feature/ui-private-events`

- event visibility selector;
- owner-only controls;
- lock badge;
- notification behavior;
- tests.

#### `feature/ui-private-tasks`

- task visibility selector;
- self-assignee behavior;
- lock badge;
- tests.

#### `feature/ui-private-data-cache-safety`

- logout/account-switch cache clearing;
- visibility-transition invalidation;
- privacy regression tests.

---

## 27. Definition of done

The feature is complete when all of the following are true:

1. A user can create a private event and private task.
2. The owner can view, edit, and delete them.
3. Another lobby member cannot list, read, edit, delete, search, or infer their details
   through application responses.
4. Unauthorized direct private access returns normal `404`.
5. A private event blocks the owner's availability.
6. Free-slot responses reveal no private details.
7. Conflict responses reveal no other member's private details.
8. Private items create no cross-member notifications.
9. Private tasks cannot be assigned to another user.
10. ICS feeds never contain another user's private event.
11. Imported calendar events are private by default.
12. Dashboard, counts, and statistics respect requester-specific visibility.
13. Analytics and logs contain no private free-form content.
14. Future AI context builders exclude private content by default.
15. Frontend caches are cleared on logout/account switch.
16. Existing shared events and tasks continue working.
17. Event migration preserves the meaning of existing `shared` rows.
18. Unit, integration, repository, UI, security, lint, typecheck, build, Checkstyle,
    SpotBugs, JaCoCo, and Sonar quality gates pass.

---

## 28. Future extensions

After V1 is validated, possible additions include:

- `SELECTED_MEMBERS`;
- `SECRET_FROM_SELECTED_MEMBERS`;
- surprise-plan aggregate;
- private attachments and checklists;
- reveal date;
- collaborator invitations excluding the surprise recipient;
- private push-notification preferences;
- application PIN or biometric lock on mobile;
- explicit AI assistance for private plans;
- personal statistics separate from lobby statistics.

These extensions must preserve the V1 rule that backend authorization is
authoritative and private content is never exposed by default.

---

## Implementation tasks

This design is split into 4 backend tasks (one per branch/PR, in dependency
order) plus 3 web tasks tracked in [the web task index](../../../../../lined-web/docs/UI_TASKS.md) (UI-51 to
UI-53). **For AI agents (Claude Code, Codex, Gemini, etc.):** read the root
`AGENTS.md` and `backend/lined/CLAUDE.md` first — every rule in there
applies. Summary: one task per branch/PR using the branch name in the linked
file; read the linked task file fully before coding; respect dependencies;
don't expand scope beyond the task file.

- [Private event access enforcement (Phase 0 bug fix)](tasks/PE-BE-01-private-event-access-enforcement.md)
- [Event visibility model + migration (Phase 1)](tasks/PE-BE-02-event-visibility-model.md)
- [Private tasks backend (Phase 2)](tasks/PE-BE-03-private-tasks.md)
- [Cross-surface privacy audit (Phases 4-5)](tasks/PE-BE-04-private-item-cross-surface-audit.md)

Suggested order: PE-BE-01 first (it is a standalone bug-fix correction with
no schema change and can ship independently). Then PE-BE-02 (adds the
persisted `visibility` enum for events). PE-BE-03 depends on PE-BE-02
because it reuses the same enum/access-policy pattern for tasks. PE-BE-04
depends on both PE-BE-02 and PE-BE-03 because it sweeps every surface
(dashboard, counters, ICS, search, statistics, analytics) that reads event
and task visibility.

Web tasks UI-51 and UI-52 can start once their respective backend task's API
is stable; UI-53 (cache/logout safety) should land last since it depends on
every visibility-aware query key existing.
