# BOLA/IDOR Security Audit and Authorization Hardening System Design

**Project:** Lined
**Area:** Backend / cross-cutting authorization / launch readiness
**Recommended repository path:** `backend/lined/docs/foundation/bola-idor-security-audit-system-design.md`
**Status:** Implementation specification
**Priority:** P0 before public beta
**Target stack:** Java 21, Spring Boot 3.5.x, Spring Security, JPA, PostgreSQL, Flyway, JUnit 5, Testcontainers

---

## 1. Purpose

This document defines the security design, implementation boundaries, audit procedure, REST behavior, test strategy, and acceptance criteria for a complete **Broken Object Level Authorization (BOLA) / Insecure Direct Object Reference (IDOR)** audit of the Lined backend.

The goal is not to add another authentication mechanism. Authentication already establishes a trusted caller through Spring Security and `CurrentUserProvider`. The goal is to prove that an authenticated user can access or mutate **only the objects and object relationships they are authorized to use**, even when they manually replace IDs in paths, query parameters, request bodies, nested resources, or retry requests.

This work is a launch-readiness security gate. It must produce both:

1. runtime authorization hardening for every confirmed gap; and
2. a PostgreSQL-backed HTTP integration regression suite that prevents the same class of vulnerability from being reintroduced.

---

## 2. Why this is required

Authentication answers:

> Who is the caller?

BOLA authorization answers:

> Is this caller allowed to perform this exact action on this exact object?

A valid JWT does **not** imply permission to operate on arbitrary IDs.

Example of an IDOR/BOLA failure:

```http
PATCH /api/users/42
Authorization: Bearer <token for user 7>
If-Match: "0"

{
  "email": "attacker@example.com"
}
```

If the backend authenticates user `7` but updates user `42` only because the path contains `42`, authentication is correct while authorization is broken.

The same class of issue can occur with:

- lobby IDs;
- task IDs;
- event IDs;
- invite IDs;
- notification IDs;
- user IDs passed as assignees, invite targets, owners, or conflict targets;
- nested child IDs that do not belong to the parent ID in the URL;
- role assignment endpoints;
- filters that return data outside the caller's accessible scope.

---

## 3. Terminology

### 3.1 BOLA

**Broken Object Level Authorization** is an API authorization flaw where a caller can access or modify an object without being authorized for that object.

### 3.2 IDOR

**Insecure Direct Object Reference** is a common implementation pattern of BOLA where the attacker changes a direct identifier such as `123` to another value and gains access.

### 3.3 Subject

The authenticated Lined user performing the request.

For protected HTTP APIs, the subject is the positive user ID resolved from the validated JWT through:

```text
Spring Security -> validated JWT subject -> CurrentUserProvider.requireUserId()
```

### 3.4 Object

A resource or stateful record on which authorization must be evaluated, for example:

- user;
- lobby;
- lobby invite;
- task;
- event;
- notification;
- notification preference;
- billing account/subscription;
- role assignment.

### 3.5 Relationship authorization

Authorization based on a relationship rather than only object ownership, for example:

- lobby owner;
- lobby member;
- invitee;
- task creator;
- task assignee;
- event creator;
- notification recipient;
- administrator.

### 3.6 BFLA

**Broken Function Level Authorization** is not the primary scope of this SDD, but any adjacent high-risk function-level authorization flaw discovered during the audit is a launch blocker and must be fixed. Role mutation is the main example in the current codebase.

---

## 4. Current Lined security baseline

The current repository already contains important security foundations that this work must preserve.

### 4.1 Trusted caller identity

`SecurityConfig` applies a default-deny authenticated boundary to non-public routes. Caller-scoped controllers use `CurrentUserProvider` to resolve the validated JWT subject. Client-controlled `X-User-Id` is not an identity source.

Relevant files:

- `src/main/java/io/backend/lined/config/SecurityConfig.java`
- `src/main/java/io/backend/lined/security/CurrentUserProvider.java`
- `src/main/java/io/backend/lined/security/SpringSecurityCurrentUserProvider.java`

### 4.2 Service-owned authorization

The backend architecture intentionally keeps object-level authorization in application/domain services rather than in the HTTP filter chain.

Existing policy seams include:

- `LobbyAccessPolicy`;
- `TaskAccessPolicy`;
- `EventAccessPolicy`.

This SDD preserves that model.

### 4.3 Private-object protections

Private events and tasks already have privacy-aware access rules and visibility filtering. This audit must treat those protections as security invariants and add regression coverage rather than replace them.

### 4.4 Real integration-test infrastructure

`src/integrationTest/` already runs the real Spring Boot application against disposable PostgreSQL with Flyway migrations and real Bearer JWT authentication.

`AbstractApiIntegrationTest` already provides:

- user registration helpers;
- Bearer JWT generation through `JwtTokenService`;
- lobby/invite helpers;
- `TestRestTemplate` HTTP calls;
- database inspection through `JdbcTemplate`;
- database cleanup between tests.

This is the authoritative test environment for the BOLA regression suite.

---

## 5. Confirmed current audit findings that motivate this work

The implementation agent must independently verify every finding against the current branch before changing code. The following findings are confirmed from the current `main` baseline used to write this specification.

### 5.1 Critical: user update is not caller-scoped

Current flow:

```text
PATCH /api/users/{id}
    -> UserController.update(id, dto, version)
    -> UserService.update(id, dto, version)
    -> repository.findById(id)
    -> mutate target user
```

`UserController.update` does not currently pass `CurrentUserProvider.requireUserId()` and `UserServiceImpl.update` does not verify that the target user is the authenticated caller.

This is a direct BOLA/IDOR launch blocker.

### 5.2 Critical adjacent authorization issue: role mutation endpoints

The current `RoleController` exposes role-management operations such as:

```text
PUT  /api/roles/user/{userId}
POST /api/roles/user/{userId}/add
POST /api/roles/user/{userId}/remove
```

The global Spring Security configuration requires authentication but does not itself make these routes admin-only. The controller shown in the current baseline does not perform a `ROLE_ADMIN` check.

This is primarily BFLA with object-level consequences and must be included in this launch security hardening. A normal authenticated user must never be able to grant or remove administrative roles.

### 5.3 Lobby outsider behavior currently reveals authorization distinction

The current integration test intentionally expects `403 Forbidden` when an authenticated outsider requests another user's lobby by numeric ID.

For public-beta hardening, the target behavior defined in this SDD is stricter:

- a caller who has no relationship with the lobby must receive `404 Not Found`;
- an existing lobby member who attempts an owner-only action receives `403 Forbidden`.

This prevents arbitrary lobby IDs from acting as an existence oracle while preserving useful authorization semantics for users who legitimately know the lobby exists.

### 5.4 User directory responses expose more fields than needed for directory use

The current full `UserDto` and search result model include fields such as email and roles. This is not automatically BOLA if the user directory is intentionally globally readable to authenticated users, but the audit must treat this as an adjacent data-exposure decision.

The security-safe target is defined in section 13.

---

## 6. Goals

The implementation must satisfy all of the following goals.

### G1. Complete object-reference inventory

Identify every client-controlled object reference in all current REST controllers:

- path variables;
- query parameters;
- request-body IDs;
- nested parent/child identifiers;
- opaque capability tokens;
- filter identifiers.

### G2. Explicit authorization contract

For every object reference, define:

- who may read it;
- who may modify it;
- who may delete it;
- whether unauthorized callers should receive `403` or `404`;
- whether child objects must be bound to a parent object;
- whether the referenced user/object must belong to the same lobby.

### G3. Server-side enforcement

Authorization must be enforced by the backend on every request. UI visibility, disabled buttons, route guards, cached state, or client-side IDs are never security controls.

### G4. Caller identity cannot be overridden

The authenticated subject comes only from `CurrentUserProvider` for caller-scoped HTTP APIs.

No request field such as these may establish caller identity:

```text
X-User-Id
userId query parameter
ownerId request body field
creatorId request body field
assigneeId request body field
```

Such values may identify **target/reference objects** only when the operation explicitly supports them, and then they must be independently authorized.

### G5. No unauthorized side effects

A denied request must not:

- mutate a row;
- increment an optimistic-lock version;
- create/delete a notification;
- create a delivery record;
- add/remove lobby membership;
- rotate ownership;
- consume/cancel an invite;
- change a role;
- write an idempotency result for an unauthorized action.

### G6. Non-enumerating responses for sensitive objects

Where object existence is not information the caller is entitled to know, unauthorized access must be indistinguishable from a missing object at the HTTP layer.

### G7. Integration regression coverage

Every sensitive object family must have negative HTTP integration tests using real JWT identities and PostgreSQL.

### G8. Minimal architectural change

Do not introduce a generic external authorization engine, ACL database, custom security framework, or annotation-based authorization system unless the audit proves the existing domain-policy architecture cannot express a required rule.

---

## 7. Non-goals

The following are explicitly outside the main scope:

- redesigning authentication/JWT/session handling;
- replacing Spring Security;
- adding OAuth/social login;
- implementing production rate limiting;
- CSP/HSTS/security-header work;
- email verification;
- full admin UI implementation;
- redesigning all numeric IDs as UUIDs.

Changing integer IDs to UUIDs is **not** a BOLA fix. Authorization must remain correct even when IDs are predictable.

If the audit finds a critical adjacent authorization problem, it is in scope to fix that specific problem even if its OWASP category is not strictly BOLA.

---

## 8. Threat model

Assume an attacker has a valid ordinary Lined account and a valid access token.

The attacker may:

1. inspect normal API traffic from their own account;
2. learn their own object IDs and some legitimate IDs of other users;
3. guess sequential numeric IDs;
4. replace IDs in path/query/body values;
5. combine a valid parent ID with a child ID from another parent;
6. replay previously valid requests;
7. pass a victim ID as `assigneeId`, `ownerId`, `userId`, or another foreign-key-like field;
8. call REST endpoints directly without using the web application;
9. add deprecated/ignored identity headers such as `X-User-Id`;
10. call owner/admin operations even when the UI hides them.

The attacker is **not** assumed to possess:

- the JWT signing key;
- another user's raw refresh token;
- database access;
- server credentials.

---

## 9. Authorization model

Every protected object-level operation conceptually evaluates:

```text
Decision = authorize(subject, action, object, relationships, context)
```

Where:

- `subject` = authenticated current user ID;
- `action` = READ / CREATE / UPDATE / DELETE / INVITE / ACCEPT / ASSIGN / ADMIN, etc.;
- `object` = target resource;
- `relationships` = owner/member/creator/invitee/recipient/admin;
- `context` = lobby membership, visibility, lifecycle, feature/plan restrictions.

Authentication happens first. Object authorization happens before state-dependent business logic.

---

## 10. Mandatory security invariants

### AUTHZ-INV-01 — trusted subject only

Every protected caller-scoped controller obtains the requester from:

```java
currentUserProvider.requireUserId()
```

No endpoint may accept an alternate caller identity from path, query, header, or body.

### AUTHZ-INV-02 — every direct object access is requester-aware

Any service operation that reads or mutates a non-public object by ID must either:

- receive the requester ID explicitly; or
- operate on an already requester-scoped object resolved by an authorization-aware repository/service.

Forbidden pattern:

```java
service.update(targetId, dto);
```

for a self/private/shared object where authorization depends on the caller.

Expected pattern:

```java
service.update(targetId, dto, requesterId, expectedVersion);
```

### AUTHZ-INV-03 — nested child belongs to parent

For endpoints such as:

```text
/api/lobbies/{lobbyId}/invites/{inviteId}
```

the backend must verify all three facts:

1. caller has the required permission on `lobbyId`;
2. `inviteId` exists and is visible to that caller;
3. `inviteId.lobbyId == lobbyId`.

Checking only the child ID or only the parent permission is insufficient.

### AUTHZ-INV-04 — body/query references require relationship authorization

A referenced object ID is never trusted merely because it exists.

Examples:

- `TaskCreateDto.assigneeId` must refer to an allowed lobby member;
- a private task must obey creator/self-assignee privacy rules;
- lobby `ownerId` transfer target must already be an eligible lobby member;
- invitation target must obey invitation rules;
- `userId` in calendar conflict APIs must not allow arbitrary calendar probing.

### AUTHZ-INV-05 — list endpoints are filtered by authorization, not post-filtered client-side

A list endpoint must never load or return all rows and rely on the frontend to hide inaccessible objects.

Repository/service queries must constrain results by caller-visible scope.

### AUTHZ-INV-06 — private/inaccessible object existence is hidden

Sensitive direct-object reads should return `404` when the caller is not entitled to know the object exists.

This includes at least:

- private task/event belonging to another user;
- notification belonging to another user;
- lobby for a complete outsider;
- invite for unrelated user/lobby;
- nested child where the child belongs to another parent.

### AUTHZ-INV-07 — known object but forbidden action returns `403`

When the caller legitimately knows the object exists but lacks the required action permission, use `403`.

Examples:

- lobby member attempts owner-only lobby update;
- lobby member attempts to remove another member when only owner may do so;
- normal user attempts an admin-only role function.

### AUTHZ-INV-08 — authorization before object-state leakage

After basic request syntax validation, authorization must occur before any response that depends on protected object state.

Do not leak:

- current version;
- lifecycle status;
- invite status;
- task/event visibility;
- ownership;
- subscription state;

before access is established.

A malformed request/header may still produce a normal `400` without loading the object. A stale `If-Match` conflict must only be evaluated after authorization.

### AUTHZ-INV-09 — denied mutations are transactionally side-effect free

Authorization failure must occur before mutations, notifications, membership updates, and persistent idempotency effects.

### AUTHZ-INV-10 — admin role is verified server-side

Admin authorization must be checked in the backend from trusted server-side role state.

Because Lined access JWTs intentionally contain a minimal claim set, new admin authorization should not depend on a client-supplied role or an unverified JWT role claim.

### AUTHZ-INV-11 — capability URLs are separately scoped

The public calendar feed token endpoint is not a numeric-ID authorization endpoint; it is a capability URL.

Its security invariant is:

```text
possession of an unguessable active token => access only to the exact feed scope represented by that token
```

The audit must verify that feed tokens cannot be used to switch to another user's/lobby's data by adding or replacing numeric parameters.

---

## 11. Target architecture

### 11.1 Architecture remains domain-policy based

The target remains:

```text
HTTP request
   |
   v
Spring Security authentication
   |
   v
Controller
   | resolves requester through CurrentUserProvider
   v
Service / application operation
   | loads object in transaction
   | calls domain access policy
   v
Repository
   v
PostgreSQL
```

Authorization belongs primarily in the service/policy layer because it often requires loaded relationships and domain state.

### 11.2 Do not centralize all object rules into `SecurityConfig`

`SecurityConfig` should continue to answer:

> Is this route public or authenticated?

It should not become a giant table of lobby/task/event object rules.

### 11.3 Do not add generic `@PreAuthorize` expressions everywhere

Method-security annotations may be appropriate for simple function-level gates, but BOLA rules in Lined depend on relationships such as lobby membership, private ownership, invitee status, and child/parent consistency.

Prefer explicit domain policies that can be unit tested.

### 11.4 Policy structure

Keep or strengthen existing policies:

```text
LobbyAccessPolicy
TaskAccessPolicy
EventAccessPolicy
```

Add focused policies where a confirmed gap exists, for example:

```text
UserAccessPolicy
RoleAuthorizationPolicy
LobbyInviteAccessPolicy      (only if current service logic cannot be kept clear)
NotificationAccessPolicy     (only if current repository/service checks are insufficient)
```

Do not create one generic `AuthorizationService<T>` abstraction solely to reduce line count. Different domains have different relationships and non-enumeration requirements.

### 11.5 Requester-aware service signatures

Any object-level method that currently lacks caller context must be changed.

Example target:

```java
UserDto update(Long targetUserId,
               UserUpdateDto dto,
               Long requesterId,
               long expectedVersion);
```

The caller check must occur before target-user state is used for authorization-sensitive decisions.

### 11.6 Authorization-aware repository queries

Use repository-scoped queries when they materially reduce accidental exposure, especially for list/detail reads.

Examples:

```text
findVisibleEventById(eventId, requesterId)
findVisibleTaskById(taskId, requesterId)
findNotificationByIdAndRecipientId(notificationId, requesterId)
findAccessibleLobbyIds(requesterId)
```

Do not force every policy into SQL. Complex owner/member/write rules may remain service/policy logic.

The repository layer is defense-in-depth, not a replacement for the domain access policy.

---

## 12. Authorization decision and HTTP response semantics

### 12.1 Standard status meanings

| Condition | HTTP status | Expected meaning |
|---|---:|---|
| Missing/invalid Bearer token | `401` | Caller is unauthenticated |
| Object missing OR object existence hidden from caller | `404` | No visible object exists for this caller |
| Caller legitimately knows object but lacks required action | `403` | Authenticated but forbidden |
| Validly authorized action conflicts with current domain state | `409` | Business/concurrency conflict |
| Missing required optimistic precondition | `428` | Request precondition absent |
| Malformed input/header | `400` | Request syntax/validation failure |

### 12.2 Error body

Use the existing RFC 7807 / Problem Details conventions.

Do not include sensitive object attributes in denied responses.

Forbidden/hidden responses must never include:

- lobby name;
- event/task title or description;
- email;
- invite target;
- notification message;
- owner/member lists;
- private visibility state;
- current entity version.

### 12.3 Existence-hiding rule

Use this rule:

```text
Can caller legitimately know this object exists?
  |
  +-- no  -> 404 for inaccessible object
  |
  +-- yes -> evaluate action permission; 403 if action forbidden
```

Examples:

```text
Outsider -> GET lobby 101                => 404
Member   -> PATCH lobby 101 owner field  => 403
Member   -> GET another member private event => 404
Wrong invitee -> accept invite 77        => 404
Normal user -> admin role mutation       => 403
```

---

## 13. REST API impact

The preferred implementation is a security hardening release, not a broad API redesign. Existing successful contracts should remain stable unless a contract itself exposes unsafe data.

### 13.1 Authentication endpoints

No BOLA contract change is expected for:

```text
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/csrf
POST /api/auth/password-reset-requests
POST /api/auth/password-resets
```

These endpoints are still included in the security inventory to ensure no object ID from the request becomes an authorization shortcut.

### 13.2 Users

#### `PATCH /api/users/{id}`

**Mandatory change.**

Current behavior must be changed so only the authenticated user may mutate their own user object.

Target flow:

```text
requesterId = CurrentUserProvider.requireUserId()
UserAccessPolicy.ensureSelf(requesterId, id)
load user
verify If-Match/version
apply update
```

Foreign user ID:

```text
403 Forbidden
```

No target state is changed.

The self-check can be performed before loading the target because the rule is simply `requesterId == targetId`; this also avoids target existence probing through update-specific responses.

#### `DELETE /api/users/{id}`

Existing self-delete check must remain and receive integration coverage for foreign IDs and no-side-effect behavior.

#### `GET /api/users/me`

Remains the canonical full self-profile endpoint.

#### `GET /api/users/{id}`

The audit must not allow the current full self-account representation to become an unrestricted cross-user data contract.

Target contract:

- self: full `UserDto` may be returned;
- another authenticated user: return a deliberately minimal public/directory projection, or restrict access according to the final product directory rule;
- never expose another user's account-only fields merely because their numeric ID is known.

Recommended minimum public projection:

```text
UserPublicDto
- id
- username
```

Future display name/avatar may be added later.

Do not expose to arbitrary authenticated callers:

```text
email
roles
subscription/account internals
optimistic version if not required
```

#### `GET /api/users/search`

Search is a directory operation, not permission to retrieve full account data.

Target search projection should be data-minimized. Recommended:

```text
id
username
```

If product behavior requires inviting by exact email, resolve that email server-side during the invite flow rather than returning every matching email in a general directory response.

#### `GET /api/users/by-role`

Treat role membership as administrative/internal data. This endpoint must become admin-only or be removed from the ordinary product surface.

### 13.3 Lobbies

#### `GET /api/lobbies/{id}`

- owner/member => `200`;
- unrelated authenticated outsider => `404`, not `403`;
- missing lobby => `404`.

#### Owner-only mutation endpoints

Examples:

```text
PATCH  /api/lobbies/{id}
DELETE /api/lobbies/{id}
DELETE /api/lobbies/{id}/members/{userId}
POST   /api/lobbies/{id}/select-as-free
POST   /api/lobbies/{id}/restore
```

Rules:

1. outsider must not learn protected lobby state; return `404`;
2. member but not owner receives `403` for owner-only action;
3. owner proceeds to business/version checks;
4. body/path target IDs must be validated as eligible members where required.

#### `GET /api/lobbies/{id}/free-slots`

Only current lobby owner/member may query. An outsider gets `404`. No private event data may appear in response or Problem Details.

### 13.4 Lobby invitations

#### Creation/list

```text
POST /api/lobbies/{lobbyId}/invites
GET  /api/lobbies/{lobbyId}/invites
```

Owner-only.

- outsider => hidden lobby semantics (`404`);
- member/non-owner => `403`;
- owner => allowed.

#### Nested invite endpoints

```text
POST   /api/lobbies/{lobbyId}/invites/{inviteId}/resend
DELETE /api/lobbies/{lobbyId}/invites/{inviteId}
```

Must verify the invite belongs to the supplied lobby.

Attack to prevent:

```text
owner of lobby A
+ lobbyId=A
+ inviteId from lobby B
```

must never mutate lobby B's invite.

Target response: `404` for mismatched/hidden child.

#### Invitee endpoints

```text
POST /api/lobby-invites/{inviteId}/accept
POST /api/lobby-invites/{inviteId}/decline
```

Only the intended invitee may act.

Wrong authenticated user => `404` to avoid invite enumeration.

### 13.5 Tasks

All direct task operations must remain requester-aware.

```text
POST   /api/tasks
PATCH  /api/tasks/{id}
GET    /api/tasks
GET    /api/tasks/mine
DELETE /api/tasks/{id}
```

Required rules:

- requester must be a member of the target lobby for creation;
- `assigneeId` must satisfy lobby membership and task visibility rules;
- private tasks remain visible only to their creator where current privacy design requires it;
- another user's private task accessed by ID => `404`;
- outsider accessing task from foreign lobby => `404`;
- denied update/delete must not increment version or produce notifications;
- list filters such as `lobbyId` and `assigneeId` cannot expand caller-visible scope.

For an explicit inaccessible `lobbyId` filter, prefer `404` rather than returning whether that lobby has matching tasks.

### 13.6 Calendar/events

```text
POST   /api/calendar/events
PATCH  /api/calendar/events/{id}
GET    /api/calendar/events/{id}
GET    /api/calendar/events
DELETE /api/calendar/events/{id}
GET    /api/calendar/conflicts
GET    /api/calendar/user-conflict
```

Required rules:

- event creation requires requester membership in target lobby;
- direct private event access by another member => `404`;
- event from foreign lobby => `404`;
- list/conflict calls cannot disclose another lobby's/private event details;
- `user-conflict?userId=...` must obey the current deliberate calendar-visibility rule and must not become a generic arbitrary-user calendar oracle;
- update/delete authorization must be evaluated before version/state-specific responses.

### 13.7 ICS/calendar feed surfaces

Audit both authenticated import/export operations and the public token feed.

Required properties:

- authenticated ICS import must require caller membership in supplied lobby;
- export must not include inaccessible private objects;
- public feed token must only expose the feed scope bound to that token;
- numeric IDs/query parameters must not allow the token holder to pivot to another lobby/user.

### 13.8 Notifications

```text
GET   /api/notifications/mine
PATCH /api/notifications/{id}/read
GET   /api/notifications/preferences
PATCH /api/notifications/preferences
```

`markRead(id)` must resolve the notification under the authenticated recipient scope.

A notification owned by another user must behave as not found:

```text
404
```

and remain unchanged in PostgreSQL.

Per-lobby notification preferences must additionally require current lobby membership.

### 13.9 Billing

`GET /api/billing/me` already avoids a user ID in the request and is the preferred BOLA-resistant API shape.

Audit rule:

- keep caller account resolution derived from the trusted subject;
- do not introduce `GET /api/billing/{userId}` for ordinary users;
- future provider/subscription admin endpoints require explicit admin/provider authorization.

### 13.10 Roles and administration

All role mutation endpoints are privileged functions.

Target rule:

```text
ordinary authenticated user -> 403
ROLE_ADMIN user              -> authorized
```

The backend must validate admin role from trusted server-side state.

A user must never be able to self-promote by submitting their own ID.

If an admin role-management REST API is not required for the MVP, removing/retiring mutation routes from the public product surface is acceptable and safer than keeping unrestricted endpoints.

### 13.11 Feature flag admin endpoints

If/when implemented, preserve their documented rule:

- validated caller from `CurrentUserProvider`;
- database-backed `ROLE_ADMIN` verification;
- no UI-only authorization;
- optimistic locking after authorization.

---

## 14. Expected code-level changes

The agent must first audit current behavior; only confirmed gaps should cause code changes.

### 14.1 User authorization

Expected changes include:

```text
user/service/UserAccessPolicy.java                  (new)
user/service/UserService.java                       (signature change if required)
user/service/UserServiceImpl.java                   (enforcement ordering)
user/api/UserController.java                        (pass requester ID)
user/api/UserPublicDto.java                         (recommended new projection)
user/api/UserSearchResultDto.java                   (data minimization if adopted)
```

Example policy:

```java
@Component
public class UserAccessPolicy {
  public void ensureSelf(Long requesterId, Long targetUserId) {
    if (!requesterId.equals(targetUserId)) {
      throw new ForbiddenException("Users can only modify their own account");
    }
  }
}
```

The exact message/code must follow existing Problem Details conventions and should not expose target-user state.

### 14.2 Lobby authorization

Potential changes:

```text
lobby/service/LobbyAccessPolicy.java
lobby/service/LobbyServiceImpl.java
lobby/domain/LobbyRepository.java
```

Recommended policy distinction:

```text
mustAccessibleLobby(id, requester) -> 404 if outsider/missing
ensureOwner(lobby, requester)      -> 403 if known member but non-owner
```

### 14.3 Invite authorization

Keep authorization in the invite service if current helpers such as `ownerInvite(...)` already correctly bind parent, child, and requester.

Add a separate policy only if it makes the security rule clearer and avoids duplicated logic.

### 14.4 Task/event authorization

Preserve `TaskAccessPolicy` / `EventAccessPolicy` as authoritative seams.

Do not weaken privacy-aware repository queries.

Adjust only confirmed gaps and error semantics.

### 14.5 Notification authorization

Prefer recipient-scoped lookup:

```text
notificationRepository.findByIdAndUser_Id(notificationId, requesterId)
```

or an equivalent query matching the actual entity mapping.

### 14.6 Role authorization

Add a reusable server-side admin authorization seam, for example:

```text
role/service/RoleAuthorizationPolicy.java
```

Conceptually:

```java
roleAuthorizationPolicy.ensureAdmin(currentUserProvider.requireUserId());
```

Do not trust a request-supplied role and do not add arbitrary role claims to the current access JWT merely to solve this task.

### 14.7 Database migrations

No schema migration is expected for the normal BOLA remediation.

If the audit discovers a missing ownership/relationship column that is genuinely required for correct authorization, create a new immutable Flyway migration. Do not edit already applied migrations.

---

## 15. Authorization-before-business-rule ordering

Service methods must follow this conceptual order:

```text
1. receive trusted requester ID
2. resolve visible/access-controlled parent/object
3. verify required action permission
4. validate relationship references
5. verify optimistic version / current business state
6. mutate
7. emit side effects/notifications
8. commit
```

Example lobby update:

```text
request
  -> resolve accessible lobby for requester
       outsider: 404
  -> ensure owner
       member: 403
  -> verify If-Match/current version
       stale: 409
  -> apply update
  -> commit
```

A non-owner must not receive a stale-version conflict for an object they were never allowed to update.

---

## 16. Audit methodology

The implementing agent must perform the audit systematically rather than patching only the confirmed user-update issue.

### Phase A — inventory

Search all production controllers under:

```text
src/main/java/io/backend/lined/**/api/*Controller.java
```

For each endpoint record:

| Field | Description |
|---|---|
| Method/path | HTTP contract |
| Authentication | public / Bearer / capability |
| Client-controlled object references | all path/query/body IDs/tokens |
| Subject source | how caller identity is obtained |
| Required relationship | self/owner/member/creator/invitee/recipient/admin |
| Current enforcement location | controller/service/policy/repository |
| Unauthorized status | expected `403`/`404` |
| Side effects | DB changes/notifications/etc. |
| Existing tests | unit/integration coverage |
| Finding | safe / gap / ambiguous |

### Phase B — attack simulation

For every object reference test at least:

```text
own valid ID
foreign valid ID
nonexistent ID
cross-parent child ID
foreign request-body reference ID
```

where applicable.

### Phase C — create failing tests

For each confirmed vulnerability or missing invariant, add a test that demonstrates the unsafe behavior before remediation where practical.

### Phase D — minimal remediation

Implement the smallest architecture-consistent fix.

### Phase E — full regression

Run unit + integration + CI gates and document the final matrix.

---

## 17. Integration-test architecture

### 17.1 Test location

Add security-oriented HTTP integration tests under:

```text
src/integrationTest/java/io/backend/lined/integration/security/
```

Recommended classes:

```text
UserObjectAuthorizationIT.java
LobbyObjectAuthorizationIT.java
LobbyInviteObjectAuthorizationIT.java
TaskObjectAuthorizationIT.java
EventObjectAuthorizationIT.java
NotificationObjectAuthorizationIT.java
AdminAuthorizationIT.java
CalendarFeedAuthorizationIT.java         # if capability/feed coverage is not already sufficient
```

Domain-specific existing ITs should remain. Security ITs are cross-cutting negative regression tests and should not replace successful workflow tests.

### 17.2 Test environment

Use the existing `@ApiIntegrationTest` infrastructure:

```text
Spring Boot random port
PostgreSQL Testcontainer
Flyway migrations
Hibernate ddl-auto=validate
real Spring Security filter chain
real JWT validation
TestRestTemplate
```

No mocked controller/service security tests may substitute for the HTTP integration suite.

### 17.3 Authentication

Use the existing JWT helper from `AbstractApiIntegrationTest`.

Security tests must send a real:

```http
Authorization: Bearer <JWT>
```

The JWT subject must match the attacker/test persona being simulated.

### 17.4 Suggested test personas

Create deterministic logical personas per test:

```text
OWNER_A     -> owns LOBBY_A
MEMBER_A    -> member of LOBBY_A
OUTSIDER    -> no relation to LOBBY_A
OWNER_B     -> owns LOBBY_B
MEMBER_B    -> member of LOBBY_B
ADMIN       -> ROLE_ADMIN
```

Objects:

```text
LOBBY_A / LOBBY_B
INVITE_A / INVITE_B
SHARED_TASK_A
PRIVATE_TASK_A
SHARED_EVENT_A
PRIVATE_EVENT_A
NOTIFICATION_A / NOTIFICATION_B
```

Do not depend on hard-coded database IDs; obtain IDs from created resources.

### 17.5 Helper extensions

`AbstractApiIntegrationTest` may be extended with focused reusable helpers, for example:

```text
acceptInvite(...)
createTask(...)
createPrivateTask(...)
createPrivateEvent(...)
responseEtag(...)
assertProblem(response, status, code)
```

Keep helpers domain-neutral enough to avoid hiding what the actual security scenario does.

---

## 18. Mandatory integration scenarios

The following scenarios are minimum acceptance coverage. Existing equivalent tests may satisfy a row if they assert the same security property and real HTTP/database behavior.

### 18.1 Authentication boundary

| Scenario | Expected |
|---|---|
| Protected object endpoint without Bearer token | `401` |
| Protected endpoint with JWT for valid different user | authorization evaluated for that subject, never request-supplied identity |
| Conflicting `X-User-Id` header | ignored; JWT subject remains authoritative |

### 18.2 Users

| Scenario | Expected |
|---|---|
| user A updates user A with correct ETag | success |
| user A updates user B by replacing path ID | `403`; user B unchanged |
| user A deletes user B | `403`; user B remains |
| user A accesses full self DTO | allowed |
| directory/read of user B | only approved public projection, no account-only fields |
| ordinary user calls users-by-role if made admin-only | `403` |

For foreign update/delete, assert database values and version are unchanged.

### 18.3 Lobbies

| Scenario | Expected |
|---|---|
| owner reads own lobby | `200` |
| member reads lobby | `200` |
| outsider reads guessed lobby ID | `404`, no lobby data |
| member performs owner-only PATCH | `403`, row unchanged |
| outsider performs owner-only PATCH | `404`, row unchanged |
| member deletes lobby | `403`, lobby remains |
| outsider queries free slots | `404` |
| member/owner queries free slots | allowed according to feature/entitlement state |

### 18.4 Lobby member references

| Scenario | Expected |
|---|---|
| owner removes valid member | allowed |
| member attempts to remove another member | `403` |
| owner transfers ownership to non-member ID | reject without ownership change |
| owner passes member ID belonging only to another lobby | reject |

### 18.5 Lobby invitations

| Scenario | Expected |
|---|---|
| owner A creates invite in lobby A | allowed |
| member A creates invite | `403` |
| outsider creates invite against lobby A | `404` |
| owner A lists lobby A invites | allowed |
| member A lists invites | `403` |
| user unrelated to invite accepts guessed invite ID | `404`; invite stays pending |
| invitee accepts own invite | allowed |
| invitee declines own invite | allowed |
| owner A uses lobby A path with invite B child ID | `404`; invite B unchanged |
| owner A resends/cancels invite B by swapping `inviteId` | `404`; invite B unchanged |

### 18.6 Tasks

| Scenario | Expected |
|---|---|
| member creates shared task in own lobby | allowed |
| outsider creates task using foreign `lobbyId` in body | hidden/rejected; no task created |
| requester assigns shared task to non-member user ID | reject; no task created |
| creator reads/updates own private task | allowed |
| another member uses private task ID | `404` |
| outsider uses shared task ID from foreign lobby | `404` |
| denied update with valid/stale ETag | no version/state change |
| denied delete | task remains |
| general task list | contains no inaccessible/private foreign rows |
| explicit foreign `lobbyId` filter | must not disclose task existence/count |

### 18.7 Events/calendar

| Scenario | Expected |
|---|---|
| member creates event in own lobby | allowed |
| outsider creates event with foreign `lobbyId` | no event created |
| member reads shared event in own lobby | allowed |
| member reads another user's private event by ID | `404` |
| outsider reads shared event from foreign lobby | `404` |
| denied event update/delete | no state/version/notification change |
| list foreign lobby events | no disclosure |
| conflict call on foreign lobby | no disclosure |
| arbitrary other-user `user-conflict` probe | rejected according to own-calendar rule |

### 18.8 Notifications

| Scenario | Expected |
|---|---|
| recipient marks own notification read | allowed |
| user A marks user B notification ID read | `404` |
| user B notification remains unread after attack | true |
| user A lists notifications | no user B records |
| user A accesses per-lobby preferences for foreign lobby | rejected/hidden |

### 18.9 Roles/admin

| Scenario | Expected |
|---|---|
| ordinary user sets own roles to ADMIN | `403`; roles unchanged |
| ordinary user changes another user's roles | `403`; roles unchanged |
| admin changes permitted role assignment | success |
| invalid target/role after admin authorization | normal validation/not-found behavior |

### 18.10 Cross-object reference swapping

At least one integration test per nested/reference family must intentionally use a **valid foreign object ID**, not only a nonexistent ID.

This is essential because testing only `999999` proves not-found handling, not BOLA protection.

---

## 19. No-side-effect assertions

Security tests for denied writes must assert more than the HTTP status.

Where relevant, verify directly in PostgreSQL that:

```text
row still exists
values unchanged
version unchanged
membership count unchanged
invite status unchanged
notification readAt unchanged
no new notification/delivery rows
no role mapping changed
```

For a denial around event/task create with idempotency keys, also verify no protected business object was persisted.

---

## 20. Unit-test requirements

Integration tests prove the end-to-end boundary. Unit tests should additionally cover each policy's decision table.

### `UserAccessPolicyTest`

```text
self -> allowed
foreign ID -> ForbiddenException
null arguments -> consistent validation behavior
```

### `LobbyAccessPolicyTest`

Cover:

```text
owner/member/outsider
owner-only decisions
```

If outsider semantics change from `ForbiddenException` to a visibility-aware not-found service boundary, update tests accordingly without conflating membership policy with object lookup.

### Task/event/invite/notification policies

Add only missing decision-table coverage. Do not duplicate every HTTP IT as a mocked unit test.

---

## 21. Data-leak regression assertions

Denied responses must be inspected, not only status-checked.

Examples:

```java
assertThat(response.getBody().has("title")).isFalse();
assertThat(response.getBody().has("name")).isFalse();
assertThat(response.getBody().has("email")).isFalse();
assertThat(response.getBody().has("memberIds")).isFalse();
```

For hidden-object `404` responses, the Problem Details shape should be the same family used for genuinely missing visible objects.

Do not create highly specific messages such as:

```text
"Event exists but belongs to another user"
"Lobby 123 exists but you are not a member"
```

for existence-hidden cases.

---

## 22. Concurrency and optimistic locking interaction

BOLA checks and optimistic locking solve different problems.

```text
authorization -> may this caller mutate it?
optimistic locking -> is the caller mutating the version they last observed?
```

Correct ordering:

```text
authorize first -> then compare version -> then mutate
```

A caller who is not authorized must not be able to use varying `If-Match` values to infer the current version of another user's object.

Tests should include at least one denied request with an intentionally stale ETag and verify the response remains an authorization/visibility result rather than a stale-version `409`.

---

## 23. Idempotency interaction

Task and event creation support `Idempotency-Key`.

Security rule:

> Idempotency never turns an unauthorized request into an authorized replay.

The idempotency scope must continue to include the trusted requester identity.

Tests should verify that:

- a key created by user A cannot cause user B to receive or mutate A's result;
- a denied foreign-lobby create does not create the protected resource;
- object authorization runs for the current requester even when the same key string was used elsewhere.

---

## 24. Feature flags and entitlements

Feature and entitlement checks are not substitutes for authorization.

Correct conceptual order:

```text
authentication
-> object visibility/authorization
-> feature/entitlement/business constraints
```

Where the existing interceptor runs feature checks before controller execution, ensure the returned feature-disabled response does not contain protected object state. Do not use feature flags to decide whether a user owns an object.

Lobby read-only plan state must be evaluated only after the caller has established access to the lobby.

---

## 25. Logging and observability

### 25.1 Logging

Authorization denials may be logged for operational diagnostics, but logs must not contain object content or credentials.

Acceptable structured fields:

```text
requestId
subjectUserId
resourceType
action
endpoint
decisionReasonCode
```

Avoid:

```text
JWT/token value
password/reset token
private event/task title or description
notification content
email as the primary log identity
```

### 25.2 Metrics

If metrics are added, use bounded labels only, for example:

```text
lined_authorization_denied_total{
  resource="lobby",
  action="read",
  reason="not_visible"
}
```

Never use user ID, object ID, email, lobby ID, or path containing a concrete ID as metric labels.

Metrics are optional for this implementation; correct enforcement and tests are mandatory.

---

## 26. Frontend impact

The frontend is not a security boundary and should require minimal changes.

### Expected no-change areas

- Bearer access-token handling;
- refresh flow;
- `CurrentUserProvider` backend identity model;
- normal authorized lobby/task/event workflows.

### Possible required updates

If user directory DTOs are hardened:

- update TypeScript user-search/public-user models;
- stop relying on email/roles from general directory endpoints;
- use `/api/users/me` for full current-user account data.

If any unsafe legacy role-management UI/API exists, ensure normal users cannot navigate to it, but remember that backend enforcement remains authoritative.

Frontend tests are required only where an API contract used by the web client changes.

---

## 27. Documentation changes required by implementation

After implementation, update:

```text
backend/lined/docs/foundation/api.md
backend/lined/docs/foundation/testing.md
backend/lined/docs/foundation/architecture.md     # only if policy structure changes
backend/lined/docs/README.md
backend/lined/docs/CONTEXT.md                     # if routing/index requires it
backend/lined/docs/product/users/CONTEXT.md
backend/lined/docs/product/lobbies/CONTEXT.md
backend/lined/docs/product/tasks/CONTEXT.md
backend/lined/docs/product/calendar/CONTEXT.md
backend/lined/docs/product/notifications/CONTEXT.md
backend/lined/docs/product/roles/CONTEXT.md
```

Only update domain docs that are actually affected.

Historical docs must not be rewritten to pretend an old insecure baseline never existed; mark superseded behavior where necessary.

---

## 28. CI requirements

The existing backend CI already runs:

```bash
./gradlew check
./gradlew integrationTest
./gradlew jacocoTestReport
```

The BOLA integration suite must run as part of the existing `integrationTest` task so it automatically becomes a pull-request gate.

Do not create a separate optional security test command that CI does not execute.

Expected local verification:

```bash
cd backend/lined
./gradlew test
./gradlew integrationTest
./gradlew check
```

If web contracts change:

```bash
cd lined-web
npm ci
npm run lint
npm run typecheck
npm run test:run
npm run build
```

---

## 29. SDD implementation plan

The implementation agent should execute the work in the following dependency order.

### BOLA-01 — Produce the object authorization inventory

**Goal:** Build a controller-to-object authorization matrix for the current code.

Tasks:

1. enumerate all controllers and endpoints;
2. enumerate every client-controlled object reference;
3. map requester source;
4. map existing policy/repository enforcement;
5. classify expected relationship and `403`/`404` behavior;
6. identify gaps;
7. record confirmed findings in the implementation PR/task notes.

**Do not start large refactors before completing this inventory.**

### BOLA-02 — Fix user-object authorization and user-directory exposure

**Goal:** Close the confirmed user-update BOLA and define safe cross-user projections.

Tasks:

1. add `UserAccessPolicy` or equivalent explicit self-check;
2. pass trusted requester ID into user update;
3. authorize before version/state-dependent behavior;
4. preserve/strengthen delete-own-account enforcement;
5. harden `GET /users/{id}` and search projections as defined in section 13;
6. make `/users/by-role` privileged or retire it;
7. add unit and PostgreSQL HTTP IT coverage.

### BOLA-03 — Harden lobby and invite object boundaries

**Goal:** Prevent numeric-ID probing, cross-lobby child swapping, and owner/member bypass.

Tasks:

1. implement outsider `404` semantics for direct protected lobby objects;
2. preserve member `403` semantics for owner-only actions;
3. verify owner-transfer/member reference validation;
4. verify nested invite parent-child binding;
5. verify invitee-only accept/decline;
6. add no-side-effect integration tests.

### BOLA-04 — Harden task/calendar/private-object surfaces

**Goal:** Prove shared/private authorization on all primary and secondary surfaces.

Tasks:

1. audit task/event create references (`lobbyId`, `assigneeId`);
2. audit direct read/update/delete;
3. audit list filters;
4. audit conflicts/free slots/ICS secondary surfaces;
5. preserve `404` for inaccessible private objects;
6. verify authorization-before-version behavior;
7. add database side-effect assertions.

### BOLA-05 — Harden notification and administrative authorization

**Goal:** Prevent notification-object swapping and function-level privilege escalation found during the audit.

Tasks:

1. verify notification recipient-scoped lookup;
2. verify per-lobby preference membership;
3. make role mutations admin-only or retire them;
4. verify normal users cannot self-promote;
5. preserve database-backed admin verification model;
6. add HTTP ITs.

### BOLA-06 — Regression consolidation and documentation

**Goal:** Turn the fixes into a permanent launch security gate.

Tasks:

1. run complete unit/integration suite;
2. remove duplicate/obsolete insecure expectations;
3. update API/error semantics docs;
4. update domain contexts;
5. document final endpoint authorization matrix;
6. ensure CI runs every new test;
7. confirm zero integration failures/errors/skips.

---

## 30. Acceptance criteria

The entire SDD is complete only when every criterion below is satisfied.

### Authentication and identity

- [ ] Every protected caller-scoped endpoint derives the caller from the validated JWT/`CurrentUserProvider`.
- [ ] Client-supplied identity headers cannot override the JWT subject.
- [ ] No protected service method trusts a target object ID as proof of authorization.

### Users

- [ ] A normal user cannot PATCH another user's account by changing `{id}`.
- [ ] A normal user cannot DELETE another user's account.
- [ ] Foreign denied writes leave DB values and version unchanged.
- [ ] Cross-user directory responses expose only explicitly approved public fields.
- [ ] Role-membership search is not an unrestricted normal-user operation.

### Lobbies/invites

- [ ] Lobby outsider direct-ID probes return the approved hidden-object response.
- [ ] Members cannot perform owner-only actions.
- [ ] Nested invite IDs are bound to their lobby IDs.
- [ ] Only invitees can accept/decline their invites.
- [ ] Denied invite/lobby writes produce no DB side effect.

### Tasks/events

- [ ] Foreign lobby IDs in creation payloads cannot create protected objects.
- [ ] Foreign task/event IDs cannot be read/updated/deleted.
- [ ] Private objects remain non-enumerable.
- [ ] List/filter/conflict/free-slot/ICS surfaces do not bypass primary authorization.
- [ ] Unauthorized requests cannot infer entity version through optimistic-lock errors.

### Notifications

- [ ] One user cannot mark another user's notification read by ID.
- [ ] Notification lists/preferences remain caller/lobby scoped.

### Admin

- [ ] Ordinary users cannot create, grant, remove, or replace privileged roles.
- [ ] Admin checks are server-side and trusted.

### Tests/CI

- [ ] BOLA tests run against PostgreSQL/Testcontainers and the full Spring Security HTTP boundary.
- [ ] Each major object family contains at least one **valid foreign ID** attack case.
- [ ] Denied mutations assert database state is unchanged.
- [ ] `./gradlew test` passes.
- [ ] `./gradlew integrationTest` passes with zero failures/errors/skips.
- [ ] `./gradlew check` passes.
- [ ] Existing frontend verification passes if contracts changed.

---

## 31. Definition of Done for each finding

A finding is not considered fixed merely because a policy check was added.

For each confirmed finding, all of these must be true:

```text
[ ] exploit reproduced or logically confirmed
[ ] authorization rule explicitly documented
[ ] runtime enforcement added at correct layer
[ ] correct 403/404 semantics selected
[ ] unauthorized response leaks no object data
[ ] no-side-effect behavior verified
[ ] unit test added where policy logic changed
[ ] PostgreSQL HTTP integration regression added
[ ] existing positive path still works
[ ] API/domain documentation updated
```

---

## 32. Security review checklist for future endpoints

Every future endpoint added to Lined should answer these questions during review:

1. Does the request contain any ID/token that identifies an object?
2. Where does caller identity come from?
3. What relationship authorizes this action?
4. Is authorization checked server-side for this request?
5. If there is a parent and child ID, is their relationship verified?
6. If the body references another user/object, is that reference authorized?
7. Can a list/filter expand beyond caller-visible scope?
8. Should an unauthorized caller see `403` or should object existence be hidden with `404`?
9. Does denial happen before version/business-state checks?
10. Can a denied request cause any side effect?
11. Is there an integration test using a valid foreign ID?
12. Does the response expose more fields than the caller needs?

If these questions cannot be answered from code and tests, the endpoint is not launch-ready.

---

## 33. Architecture after implementation

The intended final architecture is still simple:

```text
                         +-------------------------+
                         | Spring Security          |
                         | JWT authentication       |
                         +------------+------------+
                                      |
                                      v
                         +-------------------------+
                         | Controller               |
                         | CurrentUserProvider      |
                         +------------+------------+
                                      |
                                      v
               +----------------------+----------------------+
               | Service / domain operation                  |
               |                                             |
               | 1. visible object lookup                    |
               | 2. AccessPolicy decision                    |
               | 3. relationship validation                  |
               | 4. optimistic/business checks               |
               | 5. mutation                                 |
               +----------------------+----------------------+
                                      |
                                      v
                         +-------------------------+
                         | Repository / PostgreSQL |
                         | caller-scoped queries   |
                         | where appropriate       |
                         +-------------------------+
```

No new authorization microservice is required.

No client-side security model is required.

No ID obfuscation is required.

The core improvement is that **every object reference becomes explicitly bound to the authenticated subject and its permitted relationship before protected state is returned or changed**.

---

## 34. Expected launch-readiness result

After this SDD is complete, Lined should be able to make the following security claim for the audited API surface:

> Knowing or guessing another Lined object's identifier is not sufficient to read, mutate, delete, accept, assign, or administratively manage that object. Every protected operation is authorized against the authenticated caller, related object scope is validated, inaccessible sensitive objects are non-enumerable where required, and the behavior is enforced by PostgreSQL-backed HTTP integration tests in CI.

This is the required BOLA/IDOR security baseline before public beta.
