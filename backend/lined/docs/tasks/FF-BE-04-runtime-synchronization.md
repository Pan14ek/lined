# FF-BE-04 — Feature-Flag Runtime Synchronization

**Branch:** `feature/feature-flags-sync`

**Dependencies:** [FF-BE-01](FF-BE-01-feature-flag-core.md) and
[FF-BE-03](FF-BE-03-admin-management.md).

## Detailed description

Make committed admin changes converge across the two-replica and HPA backend
scenarios. PostgreSQL `LISTEN/NOTIFY` is the near-immediate invalidation path;
the existing full refresh seam remains the recovery path.

Listeners reload the complete active-environment snapshot rather than trusting
the notification payload as authoritative state. PostgreSQL-specific code must
sit behind publisher/listener adapters so normal H2 tests and local unit tests
remain fast.

## Development steps

1. Define a stable channel and bounded payload containing the environment and
   change identity/version; do not include user data or descriptions.
2. Publish only for committed admin changes. Publisher failure must be logged
   and metered but must not roll back an already committed flag update.
3. Add a managed PostgreSQL listener connection with reconnect/backoff and
   clean application shutdown.
4. Ignore notifications for another environment; matching messages trigger a
   complete repository reload and atomic snapshot replacement.
5. Schedule the configurable full refresh, default `PT30M`. A failed query
   preserves the prior snapshot and retries later.
6. Keep listener/publisher wiring inactive or replaceable when PostgreSQL is
   not the configured database.
7. Add bounded logs and Micrometer signals for refresh successes/failures,
   last success, listener reconnects, blocked requests by approved key, and
   current state. Labels must remain finite.
8. Document single-instance and multi-instance flows plus operational
   properties in `docs/feature-flags.md` and deployment configuration.

## Expected result

All healthy backend instances serving one environment observe a committed
admin change within five seconds under normal PostgreSQL operation. A missed
notification or listener outage is repaired by the scheduled full refresh
without replacing a valid snapshot with empty/partial data.

## Test scenarios

- Two independent cache/listener instances connected to one Testcontainers
  PostgreSQL database converge within five seconds after an admin update.
- Notification for another environment does not alter the local snapshot.
- Listener reload reads PostgreSQL truth rather than trusting payload state.
- Publisher failure leaves the committed database value and local after-commit
  update intact; fallback refresh repairs remote instances.
- Listener connection loss retries with bounded backoff and reconnects.
- Failed full refresh preserves the previous snapshot and records failure.
- Successful later refresh repairs missed/incorrect cache state.
- A successful zero-row query may replace the snapshot with empty state; a
  failed query may not.
- H2-backed tests start without attempting PostgreSQL LISTEN operations.
- Metrics use only approved feature/environment/outcome labels and logs avoid
  user-cardinality data.

## Verification

From `backend/lined/` run:

```bash
./gradlew test
./gradlew check
```

Run the PostgreSQL/Testcontainers synchronization test explicitly if it is
separated into an integration-test task. Also run `git diff --check` from the
monorepo root.

## Non-goals

No Redis, Kafka, WebSocket/SSE frontend updates, distributed targeting,
exactly-once delivery guarantee, or replacement of periodic recovery refresh.
