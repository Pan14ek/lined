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

### `GET /api/lobbies/{id}`

Return one lobby by id.

Response: `200 OK` with `LobbyDto`.

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

### `DELETE /api/lobbies/{id}/members/{userId}`

Remove a member from a lobby. Owner-only. The owner cannot remove themself
through this endpoint.

Response: `200 OK` with `LobbyDto`.

### `DELETE /api/lobbies/{id}`

Delete a lobby. Owner-only.

Response: `200 OK` with an empty body.

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

### `POST /api/plans`

Create a plan.

```json
{
  "name": "PRO_MONTHLY",
  "priceUsd": 9.99,
  "durationDays": 30
}
```

Response: `201 Created` with `PlanDto`.

### `PUT /api/plans/{id}`

Update a plan.

Response: `200 OK` with `PlanDto`.

### `DELETE /api/plans/{id}`

Delete a plan.

Response: `204 No Content`.

## Subscriptions

### `POST /api/subscriptions`

Start a subscription for a user.

```json
{
  "userId": 1,
  "planId": 2,
  "startDate": null,
  "endDate": null,
  "active": true
}
```

Response: `201 Created` with `SubscriptionDto`.

### `POST /api/subscriptions/{userId}/cancel-active`

Cancel the current active subscription for one user.

Response: `200 OK` with `SubscriptionDto`.

### `GET /api/subscriptions/{userId}/active`

Return the user's active subscription if one exists.

Response: `200 OK` with `SubscriptionDto`, or `404` when absent.

### `GET /api/subscriptions/{userId}/history`

Return the user's subscription history ordered by service rules.

Response: `200 OK` with `List<SubscriptionDto>`.

Subscription responses use this shape:

```json
{
  "id": 10,
  "userId": 1,
  "planId": 2,
  "planName": "PRO_MONTHLY",
  "startDate": "2025-01-01T10:00:00Z",
  "endDate": "2025-01-31T10:00:00Z",
  "active": true,
  "createdAt": "2025-01-01T10:00:00Z"
}
```

## Notifications

### `GET /api/notifications/preferences`
### `PATCH /api/notifications/preferences`

Read or partially update global notification preferences.

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
- `POST /api/plans/{planId}/subscribe`
  Use `POST /api/subscriptions` instead.
- `POST /api/plans/{planId}/cancel`
  Use `POST /api/subscriptions/{userId}/cancel-active` instead.
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
