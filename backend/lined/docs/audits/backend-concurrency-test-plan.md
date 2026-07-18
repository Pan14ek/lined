# Backend Concurrency Test Plan

Use JUnit 5 with Testcontainers PostgreSQL, `ExecutorService` (two fixed workers), `CountDownLatch ready = new CountDownLatch(2)`, and a release latch. Each worker must use an independent transaction/request. Do not use `Thread.sleep` for coordination. Assert futures, HTTP/exception response, row counts, and final persisted state after both transactions complete.

| ID | Scenario and initial state | Threads / synchronization | Operations | Expected result and final state | PostgreSQL/Testcontainers | Race detected |
| --- | --- | --- | --- | --- | --- | --- |
| CONC-T01 | Event v1 exists | 2 / ready+release latches | PATCH title vs PATCH start/end with v1 | one 200, one 409; winner only; version v2 | required/required | lost event update |
| CONC-T02 | Event v1 exists | 2 / latches | PATCH v1 vs DELETE v1 | one terminal success; other documented 404/409; no resurrected row | required/required | update/delete race |
| CONC-T03 | Task v1 TODO exists | 2 / latches | PATCH status DONE v1 twice | one transition; second idempotent 200 or 409 by API decision; one final DONE | required/required | duplicate completion |
| CONC-T04 | Task v1 TODO assigned A | 2 / latches | PATCH assignee B vs PATCH DONE | one applies; stale request 409; final row internally consistent | required/required | reassignment/completion loss |
| CONC-T05 | PENDING invite; invitee absent | 2 / latches | accept same invite | one claim; membership count one; repeat result follows documented idempotency rule | required/required | double acceptance |
| CONC-T06 | Lobby and user, no membership | 2 / latches | two membership inserts/accepts | one row in `lobby_members`; loser clean 409 or retry success | required/required | duplicate membership |
| CONC-T07 | Owner O; member M | 2 / latches | transfer owner to M vs remove M | final owner remains in members; stale action 409 | required/required | owner outside members |
| CONC-T08 | No event/task/idempotency record | 2 identical POSTs / latches; then one sequential retry | same idempotency key/body | one aggregate and one notification set; both responses reference same resource | required/required after key design | timeout/double-click duplicate |
| CONC-T09 | Valid unused reset token | 2 / latches | reset with different passwords | one success, one generic 400; used_at set once; one known final password | required/required | token double redemption |
| CONC-T10 | Notification-producing transaction deliberately fails after notification persistence | 1 integration transaction | create event/task then force rollback | zero event/task, notification, and delivery rows | H2 possible, PostgreSQL preferred | rollback/side-effect atomicity |
| CONC-T11 | No scheduled worker currently exists | N/A | N/A | Not executable until worker is introduced; then claim same work item from two pods and assert one delivery | required then | duplicate worker processing |

Implementation notes:

* Keep mapper, authorization, and invalid-window tests as unit/H2 tests. Run T01-T09 against PostgreSQL because H2 does not faithfully prove PostgreSQL partial-index, MVCC, locking, or exception behavior.
* Exercise the public MockMvc/WebTestClient contract for T01-T05/T07/T08 after service-level transaction tests establish the interleaving; verify RFC 7807 409 bodies.
* For conditional updates, assert the repository affected-row count is exactly one. For optimistic locking, assert exactly one `ObjectOptimisticLockingFailureException` is translated to 409.
* For a future worker, use a bounded batch and `FOR UPDATE SKIP LOCKED` claim test across two independent application contexts; assert each delivery business key is processed once.
