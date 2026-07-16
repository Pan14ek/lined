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
