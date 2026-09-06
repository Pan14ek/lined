# BOLA/IDOR Authorization Inventory

This matrix records the current REST authorization contract for the completed
BOLA/IDOR hardening work. The findings were verified against the controllers
and service/policy implementations before remediation, then rechecked with
PostgreSQL HTTP integration tests. The trusted subject
for protected routes is always `CurrentUserProvider.requireUserId()`; an
`X-User-Id` header or a request-body/query user ID never establishes caller
identity.

## Findings before remediation

| ID | Confirmed gap | Affected surface | Risk |
|---|---|---|---|
| BOLA-01 | `PATCH /api/users/{id}` called `UserService.update` without the authenticated subject. | Users | Foreign account mutation and version/state probing. |
| BOLA-02 | Lobby object reads and owner-only operations used a membership policy that returned `403` for complete outsiders. | Lobbies, events, tasks, invites, lobby preferences | Numeric-ID existence oracle; inconsistent hidden-object semantics. |
| BOLA-03 | Role catalog/mutation routes were authenticated-only, not admin-authorized. | Roles, users-by-role | Any authenticated user could change role mappings or create roles. |
| BOLA-04 | User detail and directory DTOs exposed email, roles, timestamps, and account-shaped fields outside self access. | Users | Unnecessary account and role data exposure. |
| BOLA-05 | Task `assigneeId` was resolved as an existing user but was not required to be a member of the target lobby. | Tasks | Cross-lobby assignment reference and unauthorized notification/relationship state. |
| BOLA-06 | Task/event idempotency claims were created before foreign-lobby authorization. | Tasks, events | A denied create could leave a persistent idempotency claim. |
| BOLA-07 | Invitee mismatch returned `403` after resolving a valid invite. | Lobby invites | Invite enumeration through a distinguishable response. |

Existing protections verified during this inventory include JWT-derived caller
identity, recipient-scoped notification lookup, private task/event visibility
queries, parent-child invite binding for owner operations, own-calendar
conflict enforcement, token-scoped ICS export, and requester-scoped task/event
idempotency keys.

## Endpoint matrix

Status values mean `safe` (the current implementation already enforced the
required relationship during the original audit), `fix` (the finding is in the
completed remediation scope), or `reviewed` (public/authentication/capability
behavior was checked and no object-level BOLA gap was found). The verification
boundary below links the PostgreSQL evidence for every `fix` family.

| Method and path | References | Subject / required relationship | Enforcement and unauthorized result | Side effects | Status |
|---|---|---|---|---|---|
| `POST /api/auth/login` | credential identifier | public; authentication only | Authentication service; generic `401` | session/token creation | reviewed |
| `POST /api/auth/refresh` | refresh cookie | cookie capability | refresh-session service; generic `401` | token rotation/replay revocation | reviewed |
| `POST /api/auth/logout` | refresh cookie | cookie capability | refresh-session service; idempotent `204` | current session revocation | reviewed |
| `GET /api/auth/csrf` | none | public | Spring CSRF infrastructure | CSRF cookie | reviewed |
| `POST /api/auth/password-reset-requests` | email/username | public; enumeration-safe | password-reset service; always `202` | token creation | reviewed |
| `POST /api/auth/password-resets` | opaque reset token | token capability | password-reset service; generic invalid-token response | password/token state | reviewed |
| `POST /api/users` | body profile | public registration | account application service | user, role, billing-account creation | reviewed |
| `PATCH /api/users/{id}` | path user ID, `If-Match` | self | `UserAccessPolicy` before lookup/version; foreign `403` | user row only on self success | fix BOLA-01 |
| `GET /api/users/me` | none | self from JWT | `CurrentUserProvider`; full self DTO | none | safe |
| `GET /api/users/{id}` | path user ID | self full DTO; foreign public projection | requester-aware service/controller; missing `404` | none | fix BOLA-04 |
| `DELETE /api/users/{id}` | path user ID, `If-Match` | self | self authorization before target state/version; foreign `403` | account deletion on self success | reviewed/fix ordering |
| `GET /api/users/search` | query text/page/size | authenticated directory; public projection only | requester-independent minimal projection | none | fix BOLA-04 |
| `GET /api/users/by-role` | query role/page/size | admin | trusted database role check; ordinary user `403` | none | fix BOLA-03 |
| `POST /api/lobbies` | body name/type | self becomes owner/member | service owner lookup and limits | lobby/member rows | safe |
| `GET /api/lobbies/mine` | none | caller membership | repository member scope | none | safe |
| `GET /api/lobbies?lifecycleStatus=ARCHIVED` | lifecycle filter | caller owner/member | repository accessible scope | none | safe |
| `GET /api/lobbies/{id}` | path lobby ID | owner/member; outsider hidden | visible-lobby lookup; outsider `404` | none | fix BOLA-02 |
| `POST /api/lobbies/{id}/select-as-free` | path lobby ID | owner | visible lookup then owner/plan checks; outsider `404`, member `403` | lobby selection state | fix BOLA-02 |
| `POST /api/lobbies/{id}/restore` | path lobby ID | owner | visible lookup then owner/state checks; outsider `404`, member `403` | lifecycle/access state | fix BOLA-02 |
| `GET /api/lobbies/{id}/free-slots` | path lobby ID, time window | member | visible membership before calendar query; outsider `404` | none | fix BOLA-02 |
| `PATCH /api/lobbies/{id}` | path lobby ID, body owner ID, `If-Match` | owner; transfer target must be member | visible lookup, owner, writable/version, member target | lobby row | fix BOLA-02 |
| `DELETE /api/lobbies/{id}/members/{userId}` | parent and child user IDs, `If-Match` | owner; target must be member/non-owner | visible lookup, owner, writable/version | membership row | fix BOLA-02 |
| `DELETE /api/lobbies/{id}` | path lobby ID, `If-Match` | owner | visible lookup, owner, writable/version | lobby aggregate | fix BOLA-02 |
| `POST /api/lobbies/{lobbyId}/invites` | parent lobby ID, invitee user/email | owner; invitee relationship | visible parent, owner, writable, invitee/member checks | invite row | fix BOLA-02 |
| `GET /api/lobbies/{lobbyId}/invites` | parent lobby ID | owner | visible parent then owner; outsider `404`, member `403` | none | fix BOLA-02 |
| `POST /api/lobbies/{lobbyId}/invites/{inviteId}/resend` | parent and child invite IDs | owner; child belongs to parent | visible parent, owner, parent-child lookup; mismatch `404` | invite timestamps | safe after parent semantics |
| `DELETE /api/lobbies/{lobbyId}/invites/{inviteId}` | parent and child invite IDs | owner; child belongs to parent | visible parent, owner, parent-child lookup; mismatch `404` | invite status | safe after parent semantics |
| `GET /api/lobby-invites/mine` | none | invitee from JWT | repository invitee scope | none | safe |
| `POST /api/lobby-invites/{inviteId}/accept` | invite ID | intended invitee | invitee-scoped lookup; wrong user `404` | invite status/membership | fix BOLA-07 |
| `POST /api/lobby-invites/{inviteId}/decline` | invite ID | intended invitee | invitee-scoped lookup; wrong user `404` | invite status | fix BOLA-07 |
| `POST /api/tasks` | body lobby/assignee IDs, idempotency key | lobby member; assignee same-lobby member | visible parent, membership, assignee relationship before claim/mutation | task/notification/idempotency rows | fix BOLA-05/06 |
| `PATCH /api/tasks/{id}` | task ID, body assignee ID, `If-Match` | visible task member; private creator rules; assignee same-lobby member | visible task and lobby, privacy, write/version, relationship checks | task/notification state | fix BOLA-05 |
| `GET /api/tasks` | query lobby/assignee/status IDs | visible task scope | repository visibility predicate; explicit lobby scope checked | none | fix BOLA-02 |
| `GET /api/tasks/mine` | none | caller-visible tasks | repository privacy/member predicate | none | safe |
| `DELETE /api/tasks/{id}` | task ID, `If-Match` | visible task member/private creator rules | visible task, privacy, write/version | task row | safe |
| `POST /api/calendar/events` | body lobby ID, idempotency key | lobby member | visible parent, membership before claim/mutation | event/notification/idempotency rows | fix BOLA-02/06 |
| `PATCH /api/calendar/events/{id}` | event ID, `If-Match` | visible event member/private owner rules | visible event, lobby, privacy, write/version | event row | safe after parent semantics |
| `GET /api/calendar/events` | query lobby ID/time window | lobby member | visible lobby then visibility-filtered repository query | none | fix BOLA-02 |
| `GET /api/calendar/events/{id}` | event ID | visible event member/private owner | visibility query then visible lobby | none | fix BOLA-02 |
| `DELETE /api/calendar/events/{id}` | event ID, `If-Match` | visible event member/private owner | visibility query, lobby, write/version | event row | safe after parent semantics |
| `GET /api/calendar/conflicts` | lobby ID/time window | lobby member | visible lobby then privacy-sanitized analyzer | none | fix BOLA-02 |
| `GET /api/calendar/user-conflict` | user ID/time window | requester may probe only own calendar | explicit `userId == requesterId`; foreign `403` | none | safe |
| `POST /api/calendar/feed-token` | none | self from JWT | caller-scoped token service | feed token rows | safe |
| `DELETE /api/calendar/feed-token` | none | self from JWT | caller-scoped token service | token revocation | safe |
| `GET /api/calendar/feed/{token}.ics` | opaque feed token | token capability bound to one user | hashed token lookup; no numeric pivot | none | safe |
| `POST /api/calendar/import` | query lobby ID, ICS body/file | lobby member; imported events private to caller | visible lobby before parse/upsert | private event rows | fix BOLA-02 |
| `GET /api/notifications/preferences` | none | self from JWT | caller-scoped preference lookup | none | safe |
| `PATCH /api/notifications/preferences` | body preferences, `If-Match` | self from JWT | caller-scoped preference lookup/version | preference row | safe |
| `GET /api/notifications/mine` | none | recipient from JWT | recipient-scoped repository query | none | safe |
| `PATCH /api/notifications/{id}/read` | notification ID | recipient only | `findByIdAndRecipientId`; foreign `404` | read timestamp | safe |
| `GET /api/lobbies/{lobbyId}/notification-preferences` | lobby ID | lobby member/self preference | visible lobby, membership, writable checks | may create preference | fix BOLA-02 |
| `PATCH /api/lobbies/{lobbyId}/notification-preferences` | lobby ID, `If-Match` | lobby member/self preference | visible lobby, membership, writable/version | preference row | fix BOLA-02 |
| `GET /api/billing/me` | none | self from JWT | owner account resolved from subject | none | safe |
| `GET /api/features` | none | public allowlisted flags | static/public feature service | none | reviewed |
| `GET /api/roles` | none | authenticated catalog read | role catalog service | none | reviewed |
| `GET /api/roles/names` | none | authenticated catalog read | role catalog service | none | reviewed |
| `POST /api/roles/{roleName}` | role name | admin | database-backed admin policy before mutation | role row | fix BOLA-03 |
| `PUT /api/roles/user/{userId}` | target user ID, role body | admin | database-backed admin policy before target lookup | role mappings | fix BOLA-03 |
| `POST /api/roles/user/{userId}/add` | target user ID, role body | admin | database-backed admin policy before target lookup | role mappings | fix BOLA-03 |
| `POST /api/roles/user/{userId}/remove` | target user ID, role body | admin | database-backed admin policy before target lookup | role mappings | fix BOLA-03 |

## Verification boundary

The matrix is an implementation aid, not a replacement for PostgreSQL HTTP
tests. Each `fix` row retains a positive path and a negative path using a
real valid foreign ID where an object reference exists. Denied writes must
assert the relevant row/version/relationship/side-effect state remains
unchanged. The PostgreSQL HTTP evidence is in
`src/integrationTest/java/io/backend/lined/integration/security/`:
`UserObjectAuthorizationIT`, `AdminAuthorizationIT`,
`LobbyInviteObjectAuthorizationIT`, `PrivateObjectAuthorizationIT`, and
`NotificationAuthorizationIT`. Existing `LobbyApiIT`, `EventApiIT`, and
`CalendarIcsApiIT` provide complementary member, privacy, and feed paths.
