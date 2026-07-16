# 📘 Lined Backend API Specification

Version: **0.1.0**  
Base URL: **http://localhost:8080**

---

## 🔑 Authentication

`POST /api/auth/login` verifies a user's password and returns a short-lived
Bearer-style token plus the authenticated user identity.

```http
Authorization: Bearer <access_token>
```

The rest of the backend still accepts the MVP `X-User-Id: <Long>` caller
identity header on endpoints that require a user id. Treat that header path as
deprecated transitional auth while request filtering is moved to the login
token.

---

## 🧍‍♂️ Users API

### Create User

`POST /api/users`

Create a new user with unique username and email.

**Request Body**

```json
{
  "username": "alex",
  "email": "alex@example.com",
  "password": "P@ssw0rd!"
}
```

**Response 201**

```json
{
  "id": 42,
  "username": "alex",
  "email": "alex@example.com",
  "createdAt": "2024-01-01T12:00:00Z",
  "roles": [
    "ROLE_USER"
  ],
  "activePlan": null,
  "activeUntil": null
}
```

---

### Get User by ID

`GET /api/users/{id}`

Retrieve user information by ID.

**Path Parameter**
| Name | Type | Example | Description |
|------|------|----------|-------------|
| `id` | Long | `1` | User ID |

**Response 200**

```json
{
  "id": 1,
  "username": "pan14ek",
  "email": "user@example.com",
  "roles": [
    "ROLE_USER"
  ],
  "activePlan": "pro",
  "activeUntil": "2024-01-01T12:00:00Z"
}
```

---

### Update User

`PATCH /api/users/{id}`

Partially update existing user fields.

**Request Body**

```json
{
  "email": "new.mail@example.com",
  "password": "N3wP@ss!"
}
```

**Response 200**

```json
{
  "id": 1,
  "username": "pan14ek",
  "email": "new.mail@example.com",
  "roles": [
    "ROLE_USER"
  ],
  "activePlan": "pro"
}
```

---

### List Users

`GET /api/users?page=0&size=10`

Get paginated list of users. Admin-only endpoint.

**Query Parameters**
| Name | Type | Default | Description |
|------|------|----------|-------------|
| `page` | int | 0 | Page number |
| `size` | int | 10 | Page size |

**Response 200**

```json
{
  "content": [
    {
      "id": 1,
      "username": "alex",
      "email": "alex@example.com"
    },
    {
      "id": 2,
      "username": "pan14ek",
      "email": "user@example.com"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 10
  },
  "totalElements": 2
}
```

---

### Delete User

`DELETE /api/users/{id}`

Delete a user by ID (admin only).

**Response 204** – User deleted successfully.

---

### Get Current User

`GET /api/users/me`

Returns the currently authenticated user's profile.

**Response 200**

```json
{
  "id": 42,
  "username": "alex",
  "email": "alex@example.com",
  "roles": [
    "ROLE_USER"
  ],
  "activePlan": "starter",
  "activeUntil": "2024-06-01T12:00:00Z"
}
```

---

## 🔐 Auth API

### Login

`POST /api/auth/login`

Verify a password for an existing user and return a token plus the user identity
needed by the current web auth store. The identifier can be an email address or
username.

**Request**

```json
{
  "identifier": "alex@example.com",
  "password": "P@ssw0rd!"
}
```

**Response 200**

```json
{
  "accessToken": "djE6NDI6MTc2MDAwMDAwMA.qfV...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "userId": 42,
  "username": "alex",
  "email": "alex@example.com",
  "roles": [
    "ROLE_USER"
  ]
}
```

**Response 401**

Returned when the identifier does not exist or the password does not match.

---

### Legacy / Planned Auth Endpoints

`POST /api/auth/refresh`, `POST /api/auth/register`, and `POST /api/auth/logout`
are not implemented yet. Registration currently uses `POST /api/users`.

---

## 👥 Lobbies API

### Update Lobby

`PATCH /api/lobbies/{id}`

The current lobby owner can partially update the name, type, and ownership.
The `X-User-Id` header identifies the owner for the current MVP authentication
path. An ownership-transfer target must already be a member of the lobby.

**Request Body**

```json
{
  "name": "Weekend Crew",
  "lobbyType": "FRIENDS",
  "ownerId": 77
}
```

All fields are optional; omitted fields remain unchanged.

**Response 200**

```json
{
  "id": 101,
  "name": "Weekend Crew",
  "lobbyType": "FRIENDS",
  "ownerId": 77,
  "memberIds": [42, 77]
}
```

**Errors**

- `403 Forbidden` when the caller is not the current owner.
- `409 Conflict` when `ownerId` is not an existing lobby member.

### Lobby Invites

Lobby owners invite a specific existing user instead of adding that user to the
lobby immediately. The invited user becomes a member only after accepting.
Invite links and notification delivery are not part of this API.

#### Create Invite

`POST /api/lobbies/{lobbyId}/invites?userId={userId}`

`POST /api/lobbies/{lobbyId}/invites?userEmail={userEmail}`

The caller must be the lobby owner. Returns a pending `LobbyInviteDto`; it does
not change the lobby's `memberIds`. Supply exactly one target selector. An
email selector resolves to an existing account; it does not send an email.

#### List and Manage Pending Invites

`GET /api/lobbies/{lobbyId}/invites`

`POST /api/lobbies/{lobbyId}/invites/{inviteId}/resend`

`DELETE /api/lobbies/{lobbyId}/invites/{inviteId}`

All three endpoints are owner-only. Listing returns only pending invitations.
Resend renews `sentAt`; it does not send email or push notifications. Delete
marks the invitation cancelled.

#### Respond to an Invite

`GET /api/lobby-invites/mine`

`POST /api/lobby-invites/{inviteId}/accept`

`POST /api/lobby-invites/{inviteId}/decline`

`mine` returns the current user's pending invitations. Only the invitee can
accept or decline; accept adds the invitee to the lobby and marks the invite
`ACCEPTED`, while decline marks it `DECLINED`.

```json
{
  "id": 501,
  "lobbyId": 101,
  "inviterId": 42,
  "inviteeId": 77,
  "status": "PENDING",
  "sentAt": "2026-07-16T10:00:00Z",
  "createdAt": "2026-07-16T10:00:00Z",
  "updatedAt": "2026-07-16T10:00:00Z"
}
```

These endpoints return `403 Forbidden` for a caller without the required owner
or invitee role, `404 Not Found` for missing resources, and `409 Conflict` for
an existing member, duplicate pending invite, or terminal invite action.

`POST /api/lobbies/{id}/members` is no longer available; clients must create
an invitation and wait for the recipient to accept it.

### Find Common Free Slots

`GET /api/lobbies/{id}/free-slots?from={timestamp}&to={timestamp}`

Returns the portions of the requested half-open time window where every current lobby member
is available. The current caller must be a lobby member and is identified by the temporary
`X-User-Id` header.

Private events block only their owner; shared events block every current member of the event's
lobby. The response deliberately contains no event metadata, so a caller can discover mutual
availability without seeing another member's private calendar details.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | Long | Lobby ID path parameter. |
| `from` | OffsetDateTime | Inclusive availability-window start. |
| `to` | OffsetDateTime | Exclusive availability-window end. |

Timestamps use ISO-8601 with an explicit UTC designator or numeric offset, for example
`2026-01-01T09:00:00Z` and `2026-01-01T11:00:00+02:00`. In a raw URL, encode the plus sign as
`%2B`. Offset-less local timestamps are rejected because the API has no timezone context with
which to interpret them safely.

**Response 200**

```json
[
  {
    "start": "2026-01-01T09:00:00Z",
    "end": "2026-01-01T11:00:00Z"
  },
  {
    "start": "2026-01-01T13:00:00Z",
    "end": "2026-01-01T22:00:00Z"
  }
]
```

**Errors**

- `400 Bad Request` when `from` and `to` do not define a non-empty time window.
- `403 Forbidden` when the caller is not a lobby member.
- `404 Not Found` when the lobby does not exist.

---

## ✅ Tasks API

### Create Task

`POST /api/tasks`

Create a task in a lobby. `description`, `priority`, and `status` are optional;
priority defaults to `MEDIUM` and status defaults to `TODO`.

```json
{
  "title": "Buy groceries",
  "lobbyId": 101,
  "description": "Pick up milk and bread",
  "priority": "HIGH",
  "status": "IN_PROGRESS",
  "notifyAssignee": true
}
```

### Update Task

`PATCH /api/tasks/{id}`

Partially update task metadata. Valid priority values are `HIGH`, `MEDIUM`, and
`LOW`. Omitted fields remain unchanged; an empty or whitespace-only
`description` clears the stored description.

### List My Tasks

`GET /api/tasks/mine`

Returns every task in lobbies where the caller is a member. The caller is
identified by the temporary `X-User-Id` request header. This endpoint is
intended for the global task board and does not accept filters; clients apply
lobby, member, and date filters locally.

Tasks from lobbies where the caller is not a member are never returned.

---

## 🛡️ Roles API

### Get All Roles

`GET /api/roles`

**Response 200**

```json
[
  {
    "id": 1,
    "name": "ROLE_USER"
  },
  {
    "id": 2,
    "name": "ROLE_ADMIN"
  }
]
```

---

### Add Role to User

`POST /api/roles/user/{userId}/add`

Assign an existing role to a user.

**Request**

```json
{
  "roleName": "ROLE_ADMIN"
}
```

**Response 200**

```json
{
  "userId": 1,
  "roles": [
    "ROLE_USER",
    "ROLE_ADMIN"
  ]
}
```

---

### Remove Role from User

`POST /api/roles/user/{userId}/remove`

Remove a specific role from user.

**Request**

```json
{
  "roleName": "ROLE_USER"
}
```

**Response 200**

```json
{
  "userId": 1,
  "roles": [
    "ROLE_ADMIN"
  ]
}
```

---

### Replace All User Roles

`PUT /api/roles/user/{userId}`

Replace all roles assigned to a user.

**Request**

```json
{
  "roles": [
    "ROLE_USER",
    "ROLE_MANAGER"
  ]
}
```

**Response 200**

```json
{
  "userId": 1,
  "roles": [
    "ROLE_USER",
    "ROLE_MANAGER"
  ]
}
```

---

## 💳 Plans API

### Get All Plans

`GET /api/plans`

List all available subscription plans.

**Response 200**

```json
[
  {
    "id": 1,
    "name": "starter",
    "price": 0,
    "durationDays": 30
  },
  {
    "id": 2,
    "name": "pro",
    "price": 9.99,
    "durationDays": 30
  }
]
```

---

### Subscribe to Plan

`POST /api/plans/{planId}/subscribe`

Subscribe the current user to a plan.

**Response 200**

```json
{
  "plan": "pro",
  "status": "active",
  "activeUntil": "2024-06-01T12:00:00Z"
}
```

---

### Cancel Subscription

`POST /api/plans/{planId}/cancel`

Cancel the active subscription.

**Response 200**

```json
{
  "plan": "pro",
  "status": "cancelled",
  "activeUntil": "2024-06-01T12:00:00Z"
}
```

---

## 📅 Calendar Events API

Calendar event endpoints require the MVP `X-User-Id` header. An event location
is optional, free-form text limited to 255 characters.

### Create Event

`POST /api/calendar/events`

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

### Update Event

`PATCH /api/calendar/events/{id}`

Send a nonblank `location` to set it. Omit `location` to preserve its current
value; send an empty or whitespace-only string to clear it.

```json
{
  "location": "Central Park"
}
```

### Event Response

Create, update, list, and conflict responses return `EventDto`, including the
nullable `location` field.

```json
{
  "id": 9001,
  "title": "Dinner together",
  "location": "Whole Foods Market",
  "shared": true,
  "startAt": "2025-11-20T17:00:00Z",
  "endAt": "2025-11-20T19:00:00Z",
  "timezone": "Europe/Kyiv",
  "lobbyId": 101,
  "ownerId": 42,
  "createdAt": "2025-11-13T10:00:00Z"
}
```

---

## 🔔 Notifications API

All notification endpoints use the temporary `X-User-Id` header. Preference
updates are partial: omitted fields keep their current value. Every preference
defaults to `true` until the user saves an explicit choice.

### Global Preferences

`GET /api/notifications/preferences`

`PATCH /api/notifications/preferences`

```json
{
  "sharedEventsEnabled": true,
  "taskAssignedEnabled": true,
  "freeSlotsEnabled": true,
  "eventRemindersEnabled": true,
  "emailDigestsEnabled": true
}
```

### Per-Lobby Preferences

`GET /api/lobbies/{lobbyId}/notification-preferences`

`PATCH /api/lobbies/{lobbyId}/notification-preferences`

```json
{
  "newEventsEnabled": true,
  "taskUpdatesEnabled": true,
  "freeSlotsEnabled": true
}
```

The caller must be a member of the lobby. A notification is emitted only when
both its global and per-lobby preference are enabled.

### Inbox

`GET /api/notifications/mine`

`PATCH /api/notifications/{id}/read`

Inbox records are visible only to their recipient. Each record contains an
immediately delivered `IN_APP` delivery and pending `EMAIL` and `PUSH`
delivery intents. This backend does not yet send external email or push
messages.

---

## ❤️ Health API

### Check Health

`GET /api/health`

Simple health and uptime information.

**Response 200**

```json
{
  "status": "UP",
  "service": "lined-backend",
  "version": "0.1.0"
}
```

---

## ⚠️ Common Error Responses

| Status | Meaning               | Example                                                             |
|:-------|:----------------------|:--------------------------------------------------------------------|
| 400    | Bad Request           | `{ "code": "VALIDATION_ERROR", "message": "Invalid email" }`        |
| 401    | Unauthorized          | `{ "title": "Unauthorized", "detail": "Invalid email, username, or password" }` |
| 403    | Forbidden             | `{ "code": "FORBIDDEN", "message": "Access denied" }`               |
| 404    | Not Found             | `{ "code": "NOT_FOUND", "message": "User not found" }`              |
| 409    | Conflict              | `{ "code": "EMAIL_EXISTS", "message": "Email already registered" }` |
| 500    | Internal Server Error | `{ "code": "SERVER_ERROR", "message": "Unexpected exception" }`     |

---

## 📄 Schemas

### UserDto

```json
{
  "id": 42,
  "username": "pan14ek",
  "email": "user@example.com",
  "createdAt": "2023-01-01T12:00:00Z",
  "roles": [
    "ROLE_USER",
    "ROLE_ADMIN"
  ],
  "activePlan": "pro",
  "activeUntil": "2024-01-01T12:00:00Z"
}
```

### ApiError

```json
{
  "code": "NOT_FOUND",
  "message": "User not found",
  "path": "/api/users/42"
}
```

---

## 🧾 OpenAPI Specification

- **Swagger UI:** [http://localhost:8080/swagger-ui](http://localhost:8080/swagger-ui)
- **JSON Docs:** [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

---

## © 2025 Lined Backend

Developed by **Pan14ek**
