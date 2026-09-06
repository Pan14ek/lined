# Lined Backend API

Version: `0.1.0`
Base URL: `http://localhost:8080`

This document describes the API surface implemented by the current Spring Boot
controllers under `src/main/java/io/backend/lined/**/api/*Controller.java`.
Planned endpoints are listed separately so the main sections stay controller
faithful.

## Authentication

`POST /api/auth/login` verifies a password through Spring Security, creates an
independent server-side refresh session, and returns a short-lived access-token
response.

```json
{
  "identifier": "alex@example.com",
  "password": "P@ssw0rd!"
}
```

The request may also supply `email` or `username` instead of `identifier`.
Successful responses use this shape:

```json
{
  "accessToken": "<HS256 JWT access token>",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

The access token is an HS256 JWT with only `sub`, `iss`, `aud`, `iat`, `exp`, and
`jti` claims. It is accepted through `Authorization: Bearer <accessToken>` on
protected paths; missing or invalid tokens return `401 auth.required` Problem
Details. Every protected caller-scoped endpoint derives the caller ID from the
validated JWT subject through the backend `CurrentUserProvider`; request headers
and query parameters do not override it. Full web token bootstrap, refresh
retry, and cache-isolation work was delivered and verified by AUTH-SEC-08 and
AUTH-SEC-10 in `lined-web`.

Successful login also sends an opaque `lined_refresh` credential only in the
`Set-Cookie` header: `HttpOnly`, configurable `Secure` (enabled by default),
`SameSite=Lax`, `Path=/api/auth`, no `Domain`, and a seven-day initial max age.
The `prod` profile requires `Secure=true` and HTTPS deployment.
The credential is never a JSON field and is persisted only as a SHA-256 hash.
`POST /api/auth/refresh` consumes that cookie exactly once, returns a new access
token, and replaces it with one successor cookie. A consumed-token replay returns
generic `401 auth.session.invalid` and revokes the associated session family.

`POST /api/auth/logout` revokes only the server-side session identified by the
current refresh cookie and returns `204 No Content`. It always expires the
configured refresh cookie, including when the cookie is missing or unknown, so
logout is idempotent and does not reveal session state. The endpoint requires the
same `X-XSRF-TOKEN` header as refresh because it authenticates through a cookie.

`GET /api/auth/csrf` initializes the non-secret CSRF token cookie required by
cookie-authenticated browser requests. The refresh endpoint requires the matching
`X-XSRF-TOKEN` request header.

An unknown identifier and an incorrect password both return the same `401`
Problem Details response: title `Invalid credentials`, detail `Invalid email,
username, or password.`, and code `auth.credentials.invalid`. The response
does not disclose whether an account exists.

### `POST /api/auth/password-reset-requests`

Requests a password reset for a signed-out user, identified by email or
username. Always returns `202 Accepted` with an empty body, whether or not
the identifier matches an account — this avoids revealing which identifiers
are registered.

```json
{
  "identifier": "alex@example.com"
}
```

When the identifier matches an account, a single-use, random, high-entropy
token is generated (30-minute expiry) and only its HMAC-SHA256 hash is
persisted. The raw token is never logged; delivery requires the future
out-of-band email/push integration.

### `POST /api/auth/password-resets`

Redeems a reset token and sets a new password. Returns `204 No Content` on
success.

```json
{
  "token": "<opaque-token-from-the-request-step>",
  "newPassword": "N3wP@ssw0rd!"
}
```

An unknown, expired, or already-used token returns a generic
`400 Bad Request` (`"Invalid or expired reset token"`) — the three cases are
not distinguished, for the same enumeration-avoidance reasoning as the
request step. On success, the token is marked used and every other
outstanding reset token for that user is invalidated.

## Users

### `POST /api/users`

Register a new user.

```json
{
  "username": "alex",
  "email": "alex@example.com",
  "password": "P@ssw0rd!"
}
```

Response: `200 OK` with `UserDto`.

### `PATCH /api/users/{id}`

Partially update a user.

All mutable Event, Task, Lobby, User, and notification-preference endpoints require
`If-Match: "{version}"`, using the `version` in the last representation (or its `ETag`
header). Missing preconditions return `428 Precondition Required`; malformed preconditions
return `400 Bad Request`; stale writes return an RFC 7807 `409 Conflict`.

```json
{
  "email": "new.mail@example.com",
  "password": "N3wP@ss!"
}
```

Response: `200 OK` with `UserDto`.

### `GET /api/users/me`

Return the caller's profile. The endpoint requires a valid Bearer JWT; the
caller does not provide a user ID in the path, query, or body. A missing or
invalid token returns `401 Unauthorized`, and an unknown JWT subject returns
`404 Not Found`.

```http
GET /api/users/me
Authorization: Bearer <accessToken>
```

Response: `200 OK` with `UserDto` and an `ETag` for the response version.

### `GET /api/users/{id}`

Return one user by id. The caller receives the full `UserDto` only for their
own ID. A foreign ID receives the deliberately minimal public projection
`{ "id": ..., "username": ... }`; email, roles, version, and account
timestamps are not exposed.

Response: `200 OK` with `UserDto` for self or `UserPublicDto` for a foreign
user ID.

### `DELETE /api/users/{id}`

Delete the caller's own account. The authenticated JWT subject must match
`{id}`; a client-supplied identity header is ignored.
Deleting an account that still owns a lobby returns `409 Conflict`.

Response: `204 No Content`.

### `GET /api/users/search?q={query}&page={page}&size={size}`

Search users by free-text query. Defaults: `page=0`, `size=20`.

Response: `200 OK` with `UserPageDto` containing only public user projections.

### `GET /api/users/by-role?role={role}&page={page}&size={size}`

Search users by role name. This is an administrator-only directory operation;
ordinary authenticated users receive `403 Forbidden`. Defaults: `page=0`,
`size=20`.

Response: `200 OK` with `UserPageDto`.

## Lobbies

### `POST /api/lobbies`

Create a lobby. The caller becomes owner and initial member.

```json
{
  "name": "Our Family",
  "lobbyType": "FAMILY"
}
```

Response: `200 OK` with `LobbyDto`.

### `GET /api/lobbies/mine`

Return lobbies where the caller is a member.

Response: `200 OK` with `List<LobbyDto>`.

### `GET /api/lobbies?lifecycleStatus=ARCHIVED`

Return archived lobbies accessible to the authenticated caller. Owners see all
of their archived lobbies; non-owner members see only archived lobbies they
belong to.

Response: `200 OK` with `List<LobbyDto>`.

### `GET /api/lobbies/{id}`

Return one lobby by id. The caller must be an owner or member; identity comes
from the validated Bearer JWT subject. A complete outsider receives `404 Not
Found`, so the endpoint does not confirm a lobby's existence. A recognized
member attempting an owner-only action receives `403 Forbidden`.

Response: `200 OK` with `LobbyDto`.

`LobbyDto` includes lifecycle fields: `lifecycleStatus`, `accessMode`,
`restrictionReason`, `archiveAt`, and `selectedAsFreeAt`.

### `POST /api/lobbies/{id}/select-as-free`

Owner-only. Select the caller's one writable Free-plan lobby. The effective
plan must allow one lobby and the target must have no more than four members.
Any earlier Free selection for the same owner is cleared.

Response: `200 OK` with `LobbyDto`. A member-limit violation returns `409`
with code `LOBBY_MEMBER_LIMIT_EXCEEDED`; a non-Free selection returns `409`
with code `LOBBY_LIMIT_EXCEEDED`.

### `POST /api/lobbies/{id}/restore`

Owner-only. Restore an archived lobby when the owner has effective-plan active
lobby capacity.

Response: `200 OK` with `LobbyDto`. Insufficient capacity returns `409` with
code `LOBBY_LIMIT_EXCEEDED`.

### `GET /api/lobbies/{id}/free-slots?from={timestamp}&to={timestamp}`

Return time windows where every current lobby member is free. The caller must
be a lobby member. The response does not expose private event details.

```json
[
  {
    "start": "2026-01-01T09:00:00Z",
    "end": "2026-01-01T11:00:00Z"
  }
]
```

Response: `200 OK` with `List<FreeSlotDto>`.

### `PATCH /api/lobbies/{id}`

Partially update lobby name, type, or owner. Owner-only.

```json
{
  "name": "Weekend Crew",
  "lobbyType": "FRIENDS",
  "ownerId": 77
}
```

`ownerId` must already identify an existing lobby member.

Response: `200 OK` with `LobbyDto`.

The response includes the next `version` and ETag. The same `If-Match` requirement applies to
member removal and lobby deletion.

### `DELETE /api/lobbies/{id}/members/{userId}`

Remove a member from a lobby. Owner-only. The owner cannot remove themself
through this endpoint.

Response: `200 OK` with `LobbyDto`.

### `DELETE /api/lobbies/{id}`

Delete a lobby. Owner-only.

Response: `200 OK` with an empty body.

Read-only lobbies reject ordinary task, event, invitation, lobby-metadata, and
preference writes with `409` and code `LOBBY_READ_ONLY_DUE_TO_PLAN`. Removing
members and deleting a lobby remain available as reduction actions.

## Lobby Invites

### `POST /api/lobbies/{lobbyId}/invites?userId={userId}`
### `POST /api/lobbies/{lobbyId}/invites?userEmail={userEmail}`

Create a pending invite for an existing user. The caller must be the lobby
owner. Supply exactly one target selector.

Response: `200 OK` with `LobbyInviteDto`.

### `GET /api/lobbies/{lobbyId}/invites`

List pending invites for a lobby. Owner-only.

Response: `200 OK` with `List<LobbyInviteDto>`.

### `POST /api/lobbies/{lobbyId}/invites/{inviteId}/resend`

Renew an invite's `sentAt` timestamp. Owner-only.

Response: `200 OK` with `LobbyInviteDto`.

### `DELETE /api/lobbies/{lobbyId}/invites/{inviteId}`

Cancel an invite. Owner-only.

Response: `200 OK` with `LobbyInviteDto`.

### `GET /api/lobby-invites/mine`

List the caller's pending invites.

Response: `200 OK` with `List<LobbyInviteDto>`.

### `POST /api/lobby-invites/{inviteId}/accept`
### `POST /api/lobby-invites/{inviteId}/decline`

Only the invitee may accept or decline an invite.

Response: `200 OK` with `LobbyInviteDto`.

Accepting a `PENDING` invite adds the invitee to the lobby and returns an `ACCEPTED` invite.
Concurrent or sequential retries by the same invitee return `200 OK` with the accepted invite.
Accepting an invite that has been cancelled or declined returns `409 Conflict`.

## Tasks

### `POST /api/tasks`

Create a task in a lobby.

`Idempotency-Key` is optional. With a supplied non-blank key of at most 255 characters, the
backend permanently scopes the key to the requester and this create operation. Retrying the same
key and equivalent body returns the first task without creating another notification delivery set.
Reusing the key with a different body returns `409 IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`. Omitting the
header retains normal independent-create behavior.

```json
{
  "title": "Buy groceries",
  "lobbyId": 101,
  "assigneeId": 77,
  "dueDate": "2025-11-20",
  "description": "Pick up milk and bread",
  "priority": "MEDIUM",
  "status": "TODO",
  "visibility": "SHARED",
  "notifyAssignee": true
}
```

Response: `200 OK` with `TaskDto`.

The caller must be visible in the target lobby. When `assigneeId` is supplied,
that user must also be a member of the same lobby; otherwise the request fails
with `400 Bad Request`. Authentication, lobby visibility, membership, and
assignee relationship checks happen before an idempotency key is claimed.

### `PATCH /api/tasks/{id}`

Partially update a task.

Send the current task version as `If-Match: "{version}"`; the successful response contains the
new version and ETag.

```json
{
  "status": "IN_PROGRESS",
  "assigneeId": 77,
  "dueDate": "2025-11-25",
  "description": "Pick up milk and bread",
  "priority": "HIGH",
  "visibility": "PRIVATE"
}
```

Response: `200 OK` with `TaskDto`.

### `GET /api/tasks?lobbyId={id}&assigneeId={id}&status={status}`

List requester-visible tasks with optional filters. A valid Bearer JWT is required. The response contains
shared tasks in the requester's member lobbies plus the requester's own private tasks, never another
creator's private task.

Response: `200 OK` with `List<TaskDto>`.

### `GET /api/tasks/mine`

Return shared tasks assigned to the caller plus private tasks created by the caller, restricted to
lobbies where the caller remains a member.

Response: `200 OK` with `List<TaskDto>`.

### `DELETE /api/tasks/{id}`

Delete a task. Accessible to the relevant lobby owner or member according to
service rules.

Response: `200 OK` with an empty body.

## Calendar

All calendar endpoints use the `/api/calendar` base path.

### `POST /api/calendar/events`

Create an event.

`Idempotency-Key` is optional. With a supplied non-blank key of at most 255 characters, the
backend permanently scopes the key to the requester and this create operation. Retrying the same
key and equivalent body returns the first event without creating another notification delivery set.
Reusing the key with a different body returns `409 IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`. Omitting the
header retains normal independent-create behavior.

`visibility` is the primary value (`SHARED` or `PRIVATE`). The legacy `shared` boolean remains
temporarily supported and must agree with `visibility` when both are supplied; it is deprecated in
responses. Omitting both creates a shared event. A private event cannot notify lobby members.

```json
{
  "title": "Dinner together",
  "location": "Whole Foods Market",
  "shared": true,
  "startAt": "2025-11-20T17:00:00Z",
  "endAt": "2025-11-20T19:00:00Z",
  "timezone": "Europe/Kyiv",
  "reminderMinutesBefore": 30,
  "lobbyId": 101,
  "notifyMembers": true
}
```

Response: `200 OK` with `EventDto`.

### `PATCH /api/calendar/events/{id}`

Partially update an event. Blank `location` clears the stored location.

`reminderMinutesBefore` is optional on create: `null` or omission uses the
30-minute default, `0` disables that event's reminder, and values through
10,080 (seven days) are accepted. On PATCH, omission or `null` leaves the
stored setting unchanged. Moving an already-reminded event or changing its
non-null reminder lead time makes its new occurrence eligible for one new
reminder.

Send the current event version as `If-Match: "{version}"`; deletion requires the same header.

Response: `200 OK` with `EventDto`.

### `GET /api/calendar/events/{id}`

Return one event visible to the authenticated caller. A caller may read a shared event or their own
private event. Another member's private event returns the normal `404 Not Found` response, so the
endpoint does not disclose that the requested identifier exists.

Response: `200 OK` with `EventDto` and an `ETag` version header.

### `GET /api/calendar/events?lobbyId={id}&from={timestamp}&to={timestamp}`

List events overlapping the requested time window. The response includes shared events plus the
caller's own private events; another lobby member's private events are omitted.

Response: `200 OK` with `List<EventDto>`.

### `DELETE /api/calendar/events/{id}`

Delete an event.

Response: `200 OK` with an empty body.

### `GET /api/calendar/conflicts?lobbyId={id}&start={timestamp}&end={timestamp}`

Return event conflicts for the specified lobby and time window. The requester
is derived exclusively from the validated Bearer JWT subject.

Response: `200 OK` with `List<EventConflictDto>`. A private conflict owned by another member has
`detailsAvailable=false` and no event ID or content; its owner ID and `shared=false` remain only as
an opaque availability explanation.

### `GET /api/calendar/user-conflict?userId={id}&start={timestamp}&end={timestamp}`

Return whether the specified user has a conflict in the requested window. The
requester is derived exclusively from the validated Bearer JWT subject.

Response: `200 OK` with `UserConflictDto`.

### `POST /api/calendar/feed-token` and `DELETE /api/calendar/feed-token`

Authenticated Bearer endpoints that create a secret personal ICS URL or
idempotently revoke every active URL. Creation returns `201 Created` with
`{ "feedUrl": "/api/calendar/feed/{token}.ics" }`; treat that path as a
bearer credential. Revocation returns `204 No Content`.

### `GET /api/calendar/feed/{token}.ics`

Unauthenticated `text/calendar; charset=UTF-8` calendar subscription endpoint.
The token is the credential. It exports the owner's private events and shared
events in their lobbies, never another member's private events. Unknown URLs
return `404`; revoked URLs return `410 Gone`.

### `POST /api/calendar/import?lobbyId={id}`

Requires a valid Bearer JWT and accepts either a raw `text/calendar` body or a
multipart `file` upload. Timed one-off VEVENTs with UID, DTSTART, and DTEND are
upserted as private caller-owned events by `(owner, lobby, UID)`; all-day,
floating, and recurring entries are skipped with errors. A wholly invalid ICS
document returns `400`.

Response example: `{ "imported": 14, "skipped": 2, "errors": [] }`.

## Roles

### `GET /api/roles`

Return all roles.

Response: `200 OK` with `List<RoleDto>`.

### `GET /api/roles/names`

Return only role names.

Response: `200 OK` with `Set<RoleNameDto>`.

### `POST /api/roles/{roleName}`

Ensure a role exists. The caller must have the database-backed `ROLE_ADMIN`
role; ordinary authenticated callers receive `403 Forbidden`. Returns
`201 Created`.

Response: `201 Created` with an empty body.

### `PUT /api/roles/user/{userId}`
### `POST /api/roles/user/{userId}/add`
### `POST /api/roles/user/{userId}/remove`

All three endpoints accept the same request shape:

```json
{
  "roles": ["ROLE_USER", "ROLE_ADMIN"]
}
```

- `PUT` replaces the user's roles.
- `POST /add` adds the supplied roles.
- `POST /remove` removes the supplied roles.

Response: `200 OK` with `Set<String>`.

All role mutations are administrator-only and resolve authority from persisted
role state, not from a caller-supplied target ID or request header.

## Features

### `GET /api/features`

Return unauthenticated feature availability for the active deployment environment. The endpoint
reads the backend's local immutable cache only; it does not query PostgreSQL and never returns
administration metadata, environments, descriptions, versions, timestamps, or unapproved keys.
Missing approved keys return `false`.

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

Response: `200 OK` with `FeatureFlagsDto`.

The endpoint remains available when later feature enforcement disables every product capability.

## Billing

### `GET /api/billing/me`

Return the current caller's billing state. The endpoint requires a valid Bearer
JWT and derives the personal billing account solely from its subject. It accepts
no `userId` path, query, or body field. A missing or invalid token returns `401
Unauthorized`.

```http
GET /api/billing/me
Authorization: Bearer <accessToken>
```

```json
{
  "billingAccountId": 31,
  "effectivePlan": "FREE",
  "subscription": null,
  "limits": {
    "lobbiesMax": 1,
    "lobbyMembersMax": 4
  }
}
```

`subscription` remains `null` until provider-backed subscription lifecycle support is introduced.
The removed `/api/subscriptions` and `/api/plans` routes return `404 Not Found`.

## Notifications

### `GET /api/notifications/preferences`
### `PATCH /api/notifications/preferences`

Read or partially update global notification preferences.

The first preferences GET creates the caller's default preference resource and returns its
version/ETag. Subsequent PATCH requests require that ETag in `If-Match`; per-lobby preferences
follow the same contract.

```json
{
  "sharedEventsEnabled": true,
  "taskAssignedEnabled": true,
  "freeSlotsEnabled": true,
  "eventRemindersEnabled": true,
  "emailDigestsEnabled": true
}
```

Response: `200 OK` with `NotificationPreferencesDto`.

### `GET /api/lobbies/{lobbyId}/notification-preferences`
### `PATCH /api/lobbies/{lobbyId}/notification-preferences`

Read or partially update the caller's per-lobby preferences.

```json
{
  "lobbyId": 101,
  "newEventsEnabled": true,
  "taskUpdatesEnabled": true,
  "freeSlotsEnabled": true
}
```

Response: `200 OK` with `LobbyNotificationPreferencesDto`.

### `GET /api/notifications/mine`

Return the caller's notification inbox.

Response: `200 OK` with `List<NotificationDto>`.

### `PATCH /api/notifications/{id}/read`

Mark one notification as read.

Response: `200 OK` with `NotificationDto`.

Inbox entries use this shape:

```json
{
  "id": 9001,
  "type": "TASK_ASSIGNED",
  "title": "Task assigned",
  "message": "Buy groceries was assigned to you",
  "lobbyId": 101,
  "taskId": 555,
  "eventId": null,
  "readAt": null,
  "createdAt": "2026-07-17T08:00:00Z",
  "deliveries": []
}
```

### Scheduled reminders

The server runs a reminder job every minute. A shared event emits an
`EVENT_REMINDER` to the current lobby owner and members; a private event emits
one only to its owner. Event reminders require both global
`eventRemindersEnabled` and per-lobby `newEventsEnabled`.

At or after `08:00 UTC`, every unfinished task due on the current UTC date is
considered for one `TASK_DUE` notification. The assignee receives it when
present; otherwise the creator does. Task due reminders require both global
`eventRemindersEnabled` and per-lobby `taskUpdatesEnabled`. Event and task
markers are claimed atomically, so repeated ticks and concurrent replicas do
not duplicate an occurrence.

## Planned / Proposal-Only Endpoints

The following endpoints are not implemented by the current controllers:

- `POST /api/auth/register`

`GET /api/health` is also not implemented by a dedicated controller in this
backend codebase.

## Common Error Responses

The backend uses RFC 7807 `ProblemDetail` responses through the application
exception layer.

Typical status codes:

- `400 Bad Request` for validation failures or malformed caller input.
- `401 Unauthorized` for login failures.
- `403 Forbidden` for owner/member/requester mismatches.
- `404 Not Found` for missing domain entities.
- `409 Conflict` for duplicate state or blocked transitions.

### Security boundary failures

An unauthenticated request to any non-public route returns `401 Unauthorized`
with `Content-Type: application/problem+json` and `WWW-Authenticate: Bearer`:

```json
{
  "type": "https://lined.app/problems/authentication-required",
  "title": "Authentication required",
  "status": 401,
  "detail": "Authentication is required to access this resource.",
  "instance": "/api/lobbies",
  "code": "auth.required"
}
```

Security authorization denials use the same Problem Details media type with
`type` `https://lined.app/problems/access-denied` and code `access.denied`.
These security-filter responses intentionally contain no credential or
authorization implementation details.

### Feature capability unavailable

Endpoints that own a user-facing capability may return `503 Service Unavailable` when its
feature flag is disabled. The controller method is not invoked:

```json
{
  "type": "https://errors.lined.app/feature.disabled",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "This feature is currently unavailable",
  "feature": "calendars.feature.enabled"
}
```

Calendar endpoints (including lobby free slots), Tasks, Notifications (including lobby
notification preferences), Billing subscription state, Lobby writes/invites, and user `PATCH` and
`DELETE` are capability-owned. Shared lobby reads, user create/read/search, Auth, public feature
discovery, and feature-flag administration remain available.

## OpenAPI

- Swagger UI: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- JSON: [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

These local endpoints are disabled when `SPRING_PROFILES_ACTIVE=prod`.
Production browser clients use same-origin routing by default. If a separate
frontend origin is required, configure `LINED_SECURITY_CORS_ALLOWED_ORIGINS`
with an explicit comma-separated HTTPS allowlist; wildcard origins are invalid
for credentialed requests.
