# Backend Concurrency Audit

Audit date: 2026-07-19. Scope is the checked-out backend source, SQL schema, Kubernetes manifests, and tests. No production code, dependencies, or migrations were changed.

## 1. Executive Summary

There is **no explicit application multithreading**: source searches found no executor, `@Async`, `@Scheduled`, `CompletableFuture`, `parallelStream`, Java lock, atomic, thread-local, or Spring event listener. Spring MVC still serves requests concurrently, so database interleavings are material.

Confirmed issues are lost updates on mutable JPA aggregates, concurrent password-reset redemption, and a lobby ownership-transfer/member-removal invariant violation. The three highest priorities are aggregate concurrency control (events/tasks/lobbies), atomic invitation/token state transitions, and idempotency/deduplication before any worker or external delivery is introduced. The service beans themselves are thread-safe: their collaborators are `final`, and no request state is retained. The application is **not safe for concurrent multi-pod writes to the same aggregates**; no instance-local state is the cause--the database update protocol is.

Overall assessment: **moderate-to-high correctness risk under concurrent writes; low current background-thread risk**.

## 2. Architecture and Concurrency Model

HTTP controllers call singleton services, which are class-level transactional (for example `EventServiceImpl`, lines 30-42; `TaskServiceImpl`, lines 26-36). Transactions are service-layer rather than controller-layer. All declared repositories extend `JpaRepository`; although the JDBC starter is present in `build.gradle`, no Spring Data JDBC aggregate/repository or `JdbcTemplate` use was found. Thus JPA/JDBC transaction-manager mixing, persistence-context bypass, and direct JDBC stale-state issues are **not confirmed from the current implementation**.

All current work is synchronous. Notifications are database rows created inside the caller transaction (`NotificationServiceImpl`, lines 127-145); there is no email/push sender, outbox, broker, scheduler, or external HTTP client. Kubernetes has a one-replica baseline but also a two-replica scenario, so the risk is relevant to intended deployment (`k8s/kind/backend.yaml`, lines 26-27).

## 3. Confirmed Findings

### CONC-001: Mutable aggregates have no optimistic or pessimistic concurrency control

* **Severity:** High
* **Confidence:** Confirmed
* **Location:** `event/domain/EventEntity.java`, `task/domain/TaskEntity.java`, `lobby/domain/LobbyEntity.java`, `user/domain/UserEntity.java`, `plan/domain/PlanEntity.java`, and their update methods; none declares `@Version`. Examples: `EventServiceImpl.update`, lines 73-95; `TaskServiceImpl.update`, lines 63-86; `LobbyServiceImpl.update`, lines 59-72.
* **Affected domain:** Event, Task, Lobby, User, Plan, notification preferences.
* **Current behavior:** Each request loads an entity, changes fields in its own persistence context, and flushes a versionless update.
* **Concurrent scenario / interleaving:**
  1. A and B read Event 7 with title `Dinner`, 18:00.
  2. A changes the title; B reschedules it.
  3. A flushes; B flushes its stale entity snapshot.
  4. **Result:** B can overwrite A's title (or A can overwrite B's schedule); both return success.
* **Impact:** Silent data loss and no client conflict signal. The same applies to task status/assignee and lobby settings.
* **Why insufficient:** `@Transactional` supplies atomicity per request, not serialization between requests. No `@Version`, `@Lock`, conditional update, ETag, or `If-Match` exists.
* **Recommended fix:** Add an API-visible aggregate version and JPA `@Version` only to user-editable aggregates (Event, Task, Lobby, User, subscription/preference records after a workflow decision). Require an expected version on PATCH; map optimistic-lock failure to 409. Use a targeted conditional update instead where a single state transition is the only operation.
* **Database changes:** Version columns for selected aggregates.
* **API behavior:** 409 Problem Detail for stale `If-Match`/version; return the latest representation or version.
* **Required tests:** PostgreSQL two-transaction update/update and update/delete tests with barriers; exactly one success and one 409.
* **Complexity:** Medium.

### CONC-002: Invitation acceptance is a check-then-act state transition

* **Severity:** High
* **Confidence:** Confirmed
* **Location:** `lobby/invite/service/LobbyInviteServiceImpl.java`, `accept`, lines 90-96; `requirePending`, lines 138-142; `lobby_invites` schema has no version column.
* **Affected domain:** Lobby invitation and membership.
* **Current behavior:** The invite is read as PENDING, membership is checked in an in-memory collection, membership is added, then status is mutated.
* **Concurrent scenario / interleaving:**
  1. A and B both POST accept for the same PENDING invite.
  2. Both read PENDING and both find no member.
  3. Both add the invitee and set ACCEPTED.
  4. The membership primary key may cause one transaction to fail with 409, or both state updates race; the endpoint is not idempotent and does not deliberately distinguish retry from conflict.
* **Impact:** Retry behavior is unstable; an eventual external side effect would be duplicated.
* **Why insufficient:** The `(lobby_id,user_id)` primary key prevents duplicate membership, but it does not atomically claim the invitation.
* **Recommended fix:** Use `UPDATE lobby_invites SET status='ACCEPTED' ... WHERE id=? AND status='PENDING'` and check affected rows, then insert membership in the same transaction; alternatively version the invite. Treat already-ACCEPTED by the same invitee as a documented idempotent success.
* **Database changes:** Optional version column; membership primary key remains correct.
* **API behavior:** first acceptance 200; repeat acceptance 200 with the accepted invite (or documented 409); cancelled/declined 409.
* **Required tests:** PostgreSQL two-request acceptance with `CountDownLatch`, membership count one, exactly one transition, and documented repeat response.
* **Complexity:** Medium.

### CONC-003: Ownership transfer can race member removal and leave an owner outside the member set

* **Severity:** High
* **Confidence:** Confirmed
* **Location:** `lobby/service/LobbyServiceImpl.java`: `update` lines 59-72, `removeMember` lines 76-86, `transferOwnership` lines 102-108.
* **Affected domain:** Lobby ownership/membership.
* **Current behavior:** Transfer verifies membership from one snapshot; removal verifies only that the *currently loaded* owner is not removed.
* **Concurrent scenario / interleaving:**
  1. A loads lobby with owner O and member M, and starts transfer to M.
  2. B loads the same lobby (owner still O) and starts removal of M.
  3. A sets owner M; B removes M because B still sees O as owner.
  4. **Result:** owner_id is M but M is no longer in `lobby_members`.
* **Impact:** Violates the service's documented ownership-membership rule and can block later authorization flows.
* **Why insufficient:** No database constraint can express this cross-table invariant and there is no aggregate version/row lock.
* **Recommended fix:** Version the Lobby aggregate and retry/reject stale writes; for this multi-row invariant, lock the lobby row (`PESSIMISTIC_WRITE`) only around transfer/remove if optimistic retries prove unsuitable.
* **Database changes:** Lobby version; no broad distributed lock.
* **API behavior:** stale operation returns 409.
* **Required tests:** PostgreSQL concurrent transfer/remove, final owner must be a member.
* **Complexity:** Medium.

### CONC-004: A password-reset token can be redeemed concurrently

* **Severity:** High
* **Confidence:** Confirmed
* **Location:** `auth/service/PasswordResetServiceImpl.java`, `reset`, lines 66-77; `auth/domain/PasswordResetTokenEntity.java` has no version/conditional-update query.
* **Affected domain:** Authentication credentials.
* **Current behavior:** Read `used_at IS NULL`, change the password, then mark token used.
* **Concurrent scenario / interleaving:**
  1. A and B submit the same valid token with different passwords.
  2. Both read `used_at = NULL`.
  3. Both update the user password and mark the token used.
  4. **Result:** both requests can succeed and the final password is last writer wins.
* **Impact:** Single-use token guarantee is violated.
* **Why insufficient:** The unique token hash prevents duplicate token rows, not duplicate redemption.
* **Recommended fix:** Atomically claim the token with a conditional update of `used_at` (affected rows must equal one) before changing the password, in one transaction. Map zero rows to the existing generic 400.
* **Database changes:** None required for conditional SQL; a version column is an alternative.
* **API behavior:** only one success; all later redemption attempts retain generic 400.
* **Required tests:** PostgreSQL dual transaction with a barrier; one success, one generic 400, one final password.
* **Complexity:** Small.

### CONC-005: Create endpoints and notification creation are not idempotent

* **Severity:** Medium
* **Confidence:** Confirmed
* **Location:** `EventServiceImpl.create`, lines 45-69; `TaskServiceImpl.create`, lines 39-60; `NotificationServiceImpl.saveNotification`, lines 127-145.
* **Affected domain:** Events, tasks, notifications.
* **Current behavior:** Every repeated request inserts a new aggregate and new notification rows; notifications have no business-key uniqueness constraint.
* **Concurrent scenario / interleaving:** a client times out after the database commit, retries the same POST, and both requests commit.
* **Impact:** Duplicate events/tasks and duplicated future email/push delivery.
* **Recommended fix:** Decide which user-facing POSTs require idempotency keys. Persist a scoped key and response digest under a unique constraint; use a unique notification business key for any delivery that must be exactly-once at the business level.
* **Database changes:** idempotency-key table/columns and selected notification unique index.
* **API behavior:** same key/body returns the first result; same key/different body returns 409.
* **Required tests:** repeated/concurrent POSTs, one row and one notification set.
* **Complexity:** Medium.

## 4. Potential Risks

### CONC-006: Preference creation has a deliberate database backstop but no retry semantics

* **Severity:** Medium; **Confidence:** Potential
* **Location:** `NotificationServiceImpl.updatePreferences`, lines 54-62, and `updateLobbyPreferences`, lines 71-81; unique constraints in `schema.sql` for user preference and `(user_id,lobby_id)`.
* **Scenario:** two first-time updates both find no row and insert different values. One insert is rejected with 409. This preserves uniqueness but may be a poor retry experience.
* **Missing information:** desired first-write/idempotency semantics are not specified.
* **Recommendation:** retain constraints; use insert-on-conflict/refresh-and-retry only if concurrent first-write UX requires it.

### CONC-007: Pool and database timeout behaviour is not configured in-repository

* **Severity:** Medium; **Confidence:** Potential
* **Location:** `application.properties`, lines 14-25.
* **Scenario:** default Tomcat request threads exceed Hikari connections while a future integration blocks; requests queue and consume threads.
* **Missing information:** environment overrides and measured workload are not in the repository. Do not select sizes without metrics.
* **Recommendation:** expose/alert on Hikari active/pending/timeout, HTTP latency, and PostgreSQL lock/query waits; set pool/query/transaction timeouts from load-test evidence.

### CONC-008: Free-slot results are a non-serializable point-in-time read

* **Severity:** Low; **Confidence:** Potential
* **Location:** `EventServiceImpl.findFreeSlots`, lines 141-148; `EventRepository.findBusyForMemberIds`, lines 45-63.
* **Scenario:** membership is read, an event changes, then events are queried; the result can be stale immediately. No cache or parallel execution exists.
* **Recommendation:** document snapshot/eventual-read semantics for this advisory calculation. A repeatable-read transaction is only needed if the product requires a single consistent snapshot; do not parallelize without measurement.

## 5. Correctly Implemented Protections

* Singleton services retain only final collaborators. The lone mutable singleton field is `SecureRandom` in `PasswordResetServiceImpl` line 43; `SecureRandom` is safe for concurrent use. Entities' `List`/`Set` fields are per persistence-context instances, not singleton caches.
* `lobby_members` primary key prevents duplicate membership; `user_roles` primary key prevents duplicate role assignment (`schema.sql`, lines 15-20 and 73-78).
* Case-insensitive unique indexes protect username, email, role, and plan names (`schema.sql`, lines 43-50). `UserServiceImpl` also catches a racing `DataIntegrityViolationException` and returns 409 (lines 47-64).
* The partial unique indexes protect one pending lobby invite and one active subscription (`schema.sql`, lines 99-100 and 37-39). They are database, not merely Java, protections.
* Subscription start/cancel is transactional (`SubscriptionServiceImpl`, lines 31-83); the active-subscription unique index turns a concurrent activation into a conflict rather than allowing two active rows.
* `GlobalExceptionHandler` maps `DataIntegrityViolationException` to 409 (lines 70-77). It does not yet map optimistic-lock exceptions because optimistic locking is absent.
* No external side effect currently occurs before commit: notification and delivery records participate in the caller transaction. Durable external delivery is **not confirmed from the current implementation**.

## 6. Database Constraint Review

| Invariant | Java protection | Database protection | Concurrent failure possible | Recommendation |
| --- | --- | --- | --- | --- |
| One lobby membership | membership check | PK `(lobby_id,user_id)` | duplicate rejected, not duplicate persisted | retain PK; make invite claim atomic |
| One pending invite | `ensureNoPendingInvite` | partial unique index | loser gets 409 | retain index; catch/translate intentionally |
| Username/email | exists checks | case-insensitive unique indexes | loser gets 409 | correct backstop |
| One active subscription | deactivate prior row | partial unique index | loser gets 409 | add desired retry/response semantics |
| Event start < end | API `CalendarTimeWindow` | none | direct/integration writer can violate | add DB CHECK when schema migration policy permits |
| Task assignee belongs to lobby | not checked | none | invalid cross-lobby assignment | address as a separate functional invariant |
| Invitation consumed once | PENDING check | no conditional state guard | yes | affected-row conditional update/version |
| Notification dedupe | none | none | yes | business key only for dedupe-required notices |

## 7. Transaction Review

| Service method | Transactional | External I/O | Read-modify-write | Lock/version | Risk |
| --- | ---: | ---: | ---: | --- | --- |
| Event create/update/delete/free slots | yes | no | update/delete | none | lost updates; advisory read snapshot |
| Task create/update/delete | yes | no | update/delete | none | lost updates |
| Lobby update/remove member | yes | no | yes | none | owner/member invariant |
| Invite create/accept | yes | no | yes | membership PK only | claim/retry race |
| Subscription start/cancel | yes | no | yes | active partial unique | no double active, conflict semantics |
| Password reset | yes | no | yes | none | double redemption |
| Notification preferences/read | yes | no | yes | unique insert keys only | lost update/first-create conflict |

No private transactional methods, controller transactions, transactional self-invocation, `readOnly` writes, lock annotations, or external I/O inside transactions were found. Deadlock/serialization retry handling is not present; it becomes necessary only after a measured/introduced lock or serializable protocol.

## 8. Endpoint Concurrency Matrix

| Resource | Operation A | Operation B | Possible conflict | Current protection | Expected API result |
| --- | --- | --- | --- | --- | --- |
| Event | PATCH | PATCH | silent field loss | none | 409 after versioning |
| Event | PATCH | DELETE | stale update/delete | none | one success, other 404/409 by contract |
| Task | PATCH status DONE | PATCH status DONE | duplicate business transition | none | idempotent 200 or 409 by transition rule |
| Task | PATCH assignee | PATCH status | stale combined state | none | 409 after versioning |
| Invite | accept | accept | duplicate claim | membership PK | one acceptance, retry-safe response |
| Lobby | ownership transfer | member removal | owner removed from members | none | one success, stale 409 |
| Scheduler | N/A | HTTP update | no scheduler exists | N/A | Not confirmed from current implementation |

## 9. Test Gap Analysis

Current tests are unit/controller/H2-oriented. They cover normal invitation acceptance and notification composition, but no test uses executor threads, latches, two database transactions, optimistic locks, idempotency, or scheduler contention. H2 can continue to cover validation and mapper/unit rules; PostgreSQL/Testcontainers is required for partial indexes, row/statement locking, isolation, affected-row concurrency, and the exact exception mapping expected in production.

## 10. Prioritized Remediation Plan

### P0 -- Correctness and data-loss risks

1. Add selected aggregate versions plus PATCH preconditions for Event, Task, Lobby, and User. Affected: their entities/DTOs/controllers, `GlobalExceptionHandler`; migration: version columns; tests: PostgreSQL concurrent update/update and update/delete; regression risk: medium.
2. Replace invitation acceptance and password-reset redemption with conditional state changes checked by affected rows. Affected: invite/token repositories and services; migration: none required; tests: dual transaction races; regression risk: low-medium.
3. Serialize/reject stale ownership transfer/removal. Affected: Lobby entity/repository/service; migration: lobby version; test invariant final owner is member; regression risk: medium.

### P1 -- Production scaling risks

1. Add scoped idempotency for create operations and notification business keys where product semantics require it. Migration: key storage/indexes; tests: retry and concurrent duplicate requests; risk: medium.
2. Before email/push/calendar workers, introduce transactional outbox plus idempotent worker claim/delivery model. Do not add Kafka/Redis/distributed locks now; the current code has no worker.

### P2 -- Performance and observability

1. Baseline Hikari, Tomcat, PostgreSQL query/lock, HTTP error/timeout metrics under the existing load workflow before configuring pool sizes.
2. Add dashboards/alerts for Hikari active/pending, `http.server.requests`, DB errors, and lock wait/query latency. Executor metrics are not applicable until an executor exists.

## 11. Future Concurrency Risks

Kafka consumers need message IDs, aggregate ID/version, partition ordering keys, idempotent handlers, retry/dead-letter policy, and transactional outbox publication; Kafka is not present today. Calendar sync needs provider event IDs, per-account idempotency, cursor/checkpoint persistence, rate-limit backoff, and conflict policy. WebSocket/SSE needs per-user connection lifecycle/backpressure and database-backed state. Notification workers need `FOR UPDATE SKIP LOCKED` or equivalent claim protocol, delivery dedupe key, bounded batches/timeouts, and multi-pod-safe retries. AI jobs need bounded executor/queue/rejection policy, context propagation, and no JPA entities across threads. None of these is a confirmed current defect.

## 12. Final Verdict

1. **Singleton thread safety:** Yes; no request-scoped mutable bean fields or caches were found.
2. **Lost updates:** No; mutable aggregate updates lack versions/conditional updates.
3. **Database business invariants:** Partially; strong for duplicate membership, names, pending invite, active subscription; absent for update/state invariants.
4. **Endpoint idempotency:** Generally no, except constraints turn some duplicate inserts into conflicts.
5. **Multiple instances:** Safe only for reads and constraints already enforced by PostgreSQL; unsafe for concurrent writes to the same mutable aggregate.
6. **H2 tests sufficient:** No for production concurrency/locking/isolation; add PostgreSQL Testcontainers tests.
7. **First three changes:** conditional reset/invite consumption; aggregate version + 409 contract; lobby ownership/member serialization.
