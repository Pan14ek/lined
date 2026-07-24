# Lined Backend API

Version: `0.1.0`
Base URL: `http://localhost:8080`

This document describes the API surface implemented by the current Spring Boot
controllers under `src/main/java/io/backend/lined/**/api/*Controller.java`.
Planned endpoints are listed separately so the main sections stay controller
faithful.

## Authentication

`POST /api/auth/login` verifies a password and returns a token-shaped response
plus the authenticated user identity.

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
  "accessToken": "djE6NDI6MTc2MDAwMDAwMA.qfV...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "userId": 42,
  "username": "alex",
  "email": "alex@example.com",
  "roles": ["ROLE_USER"]
}
```

Most caller-scoped endpoints still use the MVP `X-User-Id: <Long>` header.
`SecurityConfig` currently only provides password encoding; the backend does
not yet install a request filter that enforces the login response as Bearer
authentication automatically.

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
persisted. Until real email/push delivery exists, the raw token is logged
server-side (MVP shortcut) for manual/dev redemption.

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

All mutable Event, Task, Lobby, User, Plan, and notification-preference endpoints require
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

### `GET /api/users/{id}`

Return one user by id.

Response: `200 OK` with `UserDto`.

### `DELETE /api/users/{id}`

Delete the caller's own account. The `X-User-Id` header must match `{id}`.
Deleting an account that still owns a lobby returns `409 Conflict`.

Response: `204 No Content`.

### `GET /api/users/search?q={query}&page={page}&size={size}`

Search users by free-text query. Defaults: `page=0`, `size=20`.

Response: `200 OK` with `UserPageDto`.

### `GET /api/users/by-role?role={role}&page={page}&size={size}`

Search users by role name. Defaults: `page=0`, `size=20`.

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

Return one lobby by id.

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

```json
{
  "title": "Buy groceries",
  "lobbyId": 101,
  "assigneeId": 77,
  "dueDate": "2025-11-20",
  "description": "Pick up milk and bread",
  "priority": "MEDIUM",
  "status": "TODO",
  "notifyAssignee": true
}
```

Response: `200 OK` with `TaskDto`.

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
  "priority": "HIGH"
}
```

Response: `200 OK` with `TaskDto`.

### `GET /api/tasks?lobbyId={id}&assigneeId={id}&status={status}`

List tasks with optional filters. All query parameters are optional.

Response: `200 OK` with `List<TaskDto>`.

### `GET /api/tasks/mine`

Return tasks across all lobbies where the caller is a member.

Response: `200 OK` with `List<TaskDto>`.

### `DELETE /api/tasks/{id}`

Delete a task. Accessible to the relevant lobby owner or member according to
service rules.

Response: `200 OK` with an empty body.

## Calendar

All calendar endpoints use the `/api/calendar` base path.

### `POST /api/calendar/events`

Create an event.

```json
{
  "title": "Dinner together",
  "location": "Whole Foods Market",
  "shared": true,
  "startAt": "2025-11-20T17:00:00Z",
  "endAt": "2025-11-20T19:00:00Z",
  "timezone": "Europe/Kyiv",
  "lobbyId": 101,
  "notifyMembers": true
}
```

Response: `200 OK` with `EventDto`.

### `PATCH /api/calendar/events/{id}`

Partially update an event. Blank `location` clears the stored location.

Send the current event version as `If-Match: "{version}"`; deletion requires the same header.

Response: `200 OK` with `EventDto`.

### `GET /api/calendar/events?lobbyId={id}&from={timestamp}&to={timestamp}`

List events overlapping the requested time window.

Response: `200 OK` with `List<EventDto>`.

### `DELETE /api/calendar/events/{id}`

Delete an event.

Response: `200 OK` with an empty body.

### `GET /api/calendar/conflicts?lobbyId={id}&start={timestamp}&end={timestamp}&requesterId={id}`

Return event conflicts for the specified lobby and time window. `requesterId`
must match the caller's `X-User-Id` header.

Response: `200 OK` with `List<EventConflictDto>`.

### `GET /api/calendar/user-conflict?userId={id}&start={timestamp}&end={timestamp}&requesterId={id}`

Return whether the specified user has a conflict in the requested window.
`requesterId` must match the caller's `X-User-Id` header.

Response: `200 OK` with `UserConflictDto`.

## Roles

### `GET /api/roles`

Return all roles.

Response: `200 OK` with `List<RoleDto>`.

### `GET /api/roles/names`

Return only role names.

Response: `200 OK` with `Set<RoleNameDto>`.

### `POST /api/roles/{roleName}`

Ensure a role exists. Returns `201 Created`.

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

## Plans

### `GET /api/plans`

List all plans.

Response: `200 OK` with `List<PlanDto>`.

### `GET /api/plans/{id}`

Return one plan by id.

Response: `200 OK` with `PlanDto`.

### `GET /api/plans/by-name?name={planName}`

Return one plan by unique plan name.

Response: `200 OK` with `PlanDto`.

Plan reads are temporary legacy compatibility endpoints. They expose only identifiers, names, and
creation timestamps; pricing and duration are not returned. Plan writes are not available.

## Billing

### `GET /api/billing/me`

Return the current caller's billing state. The endpoint requires `X-User-Id` and derives the
personal billing account solely from that authenticated MVP principal. It accepts no `userId`
path, query, or body field. A missing or invalid header returns `400 Bad Request`.

```http
GET /api/billing/me
X-User-Id: 17
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
The removed `/api/subscriptions` routes and plan write routes return `404 Not Found`.

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

## Planned / Proposal-Only Endpoints

The following endpoints are not implemented by the current controllers:

- `GET /api/users/me`
  See [docs/api-proposals/users-me-endpoint.md](api-proposals/users-me-endpoint.md).
- `POST /api/auth/refresh`
- `POST /api/auth/register`
- `POST /api/auth/logout`

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

## OpenAPI

- Swagger UI: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- JSON: [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)
