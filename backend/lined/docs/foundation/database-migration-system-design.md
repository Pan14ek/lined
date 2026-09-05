# Lined Database Migration System Design

**Status:** Approved architecture and Codex implementation specification  
**Repository:** `Pan14ek/lined`  
**Backend:** `backend/lined/`  
**Canonical location:** `backend/lined/docs/foundation/database-migration-system-design.md`  
**Repository baseline analyzed:** `main` at `a31c75aa0ee37c3cdc2550271b6160b82ca2c960` after the Java 21 migration  
**Target principle:** **Flyway owns schema evolution. Hibernate validates schema. Application code never silently mutates the production schema.**

---

## 1. Purpose

This document defines how Lined adopts and operates Flyway for PostgreSQL schema evolution. It is both the architecture decision and the implementation contract for Codex or any other coding agent.

The document covers:

- the current persistence/bootstrap model and its risks;
- the target Flyway ownership model;
- clean baseline construction;
- fresh-database and existing-database adoption;
- reference-data and backfill strategy;
- migration naming, ordering, transactions, locking, and immutability;
- H2 versus PostgreSQL testing responsibilities;
- CI and schema-contract verification;
- rollout, rollback, and forward-fix policy;
- multi-replica and database-role hardening;
- dependency-ordered implementation tasks with acceptance criteria.

This is not a general database redesign. The goal is to make the existing Lined PostgreSQL contract explicit, reproducible, testable, and safe to evolve.

---

## 2. Codex Implementation Contract

Before changing any of the following, Codex must read this document together with `backend/lined/AGENTS.md`, `docs/CONTEXT.md`, `docs/foundation/architecture.md`, and `docs/foundation/testing.md`:

- `build.gradle` database dependencies;
- Spring datasource, Flyway, SQL-init, or Hibernate schema settings;
- files under `src/main/resources/db/migration/`;
- schema-related Testcontainers tests;
- database deployment/migration behavior;
- PostgreSQL version alignment;
- database privileges or migration-job deployment.

Implementation is **task-scoped**. A prompt such as `Implement DB-MIG-05` means implement DB-MIG-05 and only its explicit prerequisites. Do not opportunistically implement later tasks, redesign product domains, add speculative indexes, or rewrite migration history.

If repository state conflicts with this specification, do not silently choose a new architecture. Stop the affected portion of the task, report the mismatch, and update the design through review.

The first Flyway implementation branch may already contain draft changes produced while this specification is being introduced. Those changes are not authoritative merely because they exist. Review them against this document; keep, revise, or discard them according to the acceptance criteria below.

The Java 21 migration is already complete. Flyway work must preserve the established backend baseline:

```text
Java 21
Spring Boot 3.5.6
Gradle 8.14.3
JaCoCo 0.8.15
```

Do not bundle another Java/runtime/toolchain migration into the database cutover.

---

## 3. Current State

### 3.1 Runtime versions

At the analyzed `main` baseline:

- Java toolchain: 21;
- Spring Boot: 3.5.6;
- Gradle wrapper: 8.14.3;
- PostgreSQL is the production/runtime database;
- PostgreSQL 16 is used by the dedicated integration Testcontainers path;
- the repository also contains PostgreSQL 15/18 references in other local/research deployment artifacts;
- H2 is used by fast Spring/JPA tests;
- schema construction is not owned by Flyway or Liquibase.

### 3.2 Current default schema construction

The existing default configuration uses both Spring SQL initialization and Hibernate mutation:

```properties
spring.sql.init.mode=always
spring.sql.init.schema-locations=classpath:database/schema.sql
spring.jpa.hibernate.ddl-auto=update
```

Approximate startup behavior:

```text
Application start
    |
    v
DataSource
    |
    v
Spring SQL initialization
    |
    v
database/schema.sql
    |
    +-- CREATE TABLE IF NOT EXISTS
    +-- ALTER TABLE ... IF NOT EXISTS
    +-- indexes / constraints
    +-- seed data
    +-- backfills
    +-- legacy destructive DROP statements
    |
    v
Hibernate EntityManagerFactory
    |
    v
ddl-auto=update
    |
    v
Application ready
```

This means schema ownership is split between a cumulative SQL convergence script, Hibernate metadata, and historical database state.

### 3.3 Production profile risk

`application-prod.properties` does not currently define an independent safe schema-ownership model. Without external overrides, production inherits the main SQL-init and Hibernate behavior.

This is unacceptable as a long-term production contract because application startup can implicitly mutate the schema.

### 3.4 H2 path

H2 tests currently rely on Hibernate-generated schema and do not reproduce PostgreSQL-specific behavior.

Important PostgreSQL-only invariants include:

- expression indexes such as `LOWER(username)`;
- partial unique indexes;
- PostgreSQL timestamp semantics;
- PostgreSQL `CHECK` constraints;
- `ON CONFLICT` DML;
- PostgreSQL catalog behavior;
- Flyway/PostgreSQL locking and transaction behavior.

H2 is therefore useful for fast mapping/repository tests but cannot be the migration authority.

### 3.5 Dedicated integration path

The existing dedicated integration profile historically used:

```yaml
spring:
  jpa:
    defer-datasource-initialization: true
    hibernate:
      ddl-auto: create-drop
  sql:
    init:
      mode: always
```

That produces a different schema-construction order from normal runtime:

```text
Fresh PostgreSQL Testcontainer
    |
    v
Hibernate create-drop
    |
    v
schema.sql
    |
    v
HTTP integration tests
```

The target integration path must instead be exactly:

```text
Fresh PostgreSQL Testcontainer
    |
    v
Flyway migrate
    |
    v
Hibernate validate
    |
    v
HTTP integration tests
```

---

## 4. Problems to Solve

### 4.1 Multiple schema owners

A schema cannot be considered deterministic when both `schema.sql` and Hibernate `update` can change it.

### 4.2 No ordered migration history

`schema.sql` represents convergence to a current state. It does not express a reviewable, immutable sequence such as:

```text
V1 -> V2 -> V3 -> ... -> current
```

### 4.3 Historical operations rerun at startup

The current script contains historical ALTER/backfill/drop logic that is harmless only because of defensive guards. That is not a production migration model.

### 4.4 JPA cannot express the full PostgreSQL contract

Examples include:

- case-insensitive uniqueness implemented with `LOWER(...)` expression indexes;
- partial unique indexes for pending invitations and active tokens/subscriptions;
- database-only `CHECK` constraints;
- specific foreign-key delete actions;
- defaults and PostgreSQL-specific index semantics.

`ddl-auto=validate` is therefore a compatibility check, not a complete database-contract verifier.

### 4.5 Existing database adoption is risky without verification

A pre-Flyway database may contain:

- missing objects that Hibernate silently added elsewhere;
- extra objects from old schema versions;
- manually changed constraints/indexes;
- data that violates the intended current schema;
- legacy tables whose safe disposition is unknown.

Blind automatic baselining would convert unknown drift into trusted history.

---

## 5. Goals

1. Establish one owner for production schema evolution.
2. Make every schema change version-controlled and reviewable.
3. Make an empty PostgreSQL database reproducibly migratable to current state.
4. Make existing populated databases adopt Flyway without data loss.
5. Fail fast on schema drift.
6. Preserve PostgreSQL-specific constraints, indexes, defaults, foreign keys, and identity behavior.
7. Keep backward-compatible rolling-deployment rules explicit.
8. Make migration history immutable.
9. Test migration behavior on PostgreSQL, not only H2.
10. Support later separation of migration privileges from runtime privileges.

---

## 6. Non-Goals

The Flyway project must not simultaneously:

- change the established Java 21 toolchain;
- redesign the domain model;
- convert `BIGSERIAL` to identity columns;
- replace H2 everywhere;
- introduce PostgreSQL native enum types;
- redesign billing provider/catalog semantics;
- redesign feature flags;
- remove the legacy `events.shared` compatibility field before its privacy migration reaches contract phase;
- add speculative performance indexes;
- optimize unrelated application queries;
- design a full backup/PITR platform.

If schema debt is discovered during baseline reconstruction, document it and handle it with later migrations unless reproducing the current contract requires it.

---

## 7. Architecture Decision

### 7.1 Chosen technology

Use Flyway with explicit PostgreSQL SQL migrations.

Why Flyway fits Lined:

- the project already relies on PostgreSQL-specific SQL;
- SQL should remain directly visible in code review;
- Spring Boot integration is straightforward;
- Flyway provides ordering, checksums, migration history, validation, locking, and transactional execution;
- the project does not need Liquibase's larger change-set abstraction layer for this use case.

### 7.2 Target ownership

```text
Git repository
    |
    v
src/main/resources/db/migration/
    |
    v
Flyway
    |
    v
PostgreSQL
    |
    v
Hibernate ddl-auto=validate
    |
    v
Application
```

The rule is:

> Flyway evolves the schema. Hibernate verifies that entity mappings are compatible. The application never silently repairs schema differences.

### 7.3 Required dependencies

Spring Boot dependency management should manage Flyway versions.

```gradle
implementation 'org.flywaydb:flyway-core'
runtimeOnly 'org.flywaydb:flyway-database-postgresql'
```

Do not hard-pin a Flyway version unless a separately approved compatibility issue requires it.

A Flyway Gradle plugin is not required for the initial architecture. Application startup and test bootstrap are sufficient initially; dedicated operational tooling can be added later if needed.

---

## 8. Runtime Configuration

### 8.1 PostgreSQL runtime target

```properties
spring.sql.init.mode=never
spring.jpa.hibernate.ddl-auto=validate

spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration
spring.flyway.default-schema=public
spring.flyway.baseline-on-migrate=false
spring.flyway.validate-on-migrate=true
spring.flyway.validate-migration-naming=true
spring.flyway.out-of-order=false
spring.flyway.clean-disabled=true
spring.flyway.fail-on-missing-locations=true
```

### 8.2 Why `baselineOnMigrate=false`

Do not use automatic baselining as a convenience for non-empty databases.

Automatic baselining can hide:

- pointing an application at the wrong database;
- schema drift;
- incomplete historical state;
- a database that looks non-empty for unrelated reasons.

Existing databases require explicit operator-controlled verification and baseline.

### 8.3 H2 target

For ordinary H2-backed tests:

```properties
spring.flyway.enabled=false
spring.sql.init.mode=never
spring.jpa.hibernate.ddl-auto=create-drop
```

H2 is intentionally non-authoritative.

### 8.4 Integration-test target

PostgreSQL Testcontainers must use:

```yaml
spring:
  flyway:
    enabled: true
  jpa:
    hibernate:
      ddl-auto: validate
  sql:
    init:
      mode: never
```

No `defer-datasource-initialization` workaround is needed after Flyway owns schema creation.

---

## 9. Migration Layout and Naming

### 9.1 Location

```text
backend/lined/src/main/resources/db/migration/
```

### 9.2 Naming convention

Use UTC timestamp versions:

```text
VYYYYMMDD_HHMMSS__description.sql
```

Examples:

```text
V20260905_135100__baseline_schema.sql
V20260905_135101__bootstrap_reference_data.sql
V20260905_135102__backfill_personal_billing_accounts.sql
V20260918_091500__add_event_source.sql
```

Reasons:

- fewer collisions across parallel branches;
- natural chronology;
- readable commit history;
- works with `outOfOrder=false` when branch freshness is enforced.

### 9.3 Branch conflict rule

Before merge, a new migration must have a version greater than the latest migration on updated `main`.

If another branch merged a later migration first:

1. rebase/merge latest `main`;
2. rename the still-unapplied migration to a new timestamp;
3. rerun migration tests;
4. do not enable `outOfOrder=true` to avoid the conflict.

### 9.4 Immutable history

Once a migration may have run in a persistent shared environment, do not edit it.

Fix mistakes with a new migration.

Allowed exception before merge: an unapplied migration on a feature branch may be renamed or edited while still under review.

---

## 10. Initial Migration Chain

The adoption chain should separate structural state from reference/bootstrap data and data backfills.

```text
V<BASELINE>__baseline_schema.sql
    |
    v
V<BASELINE+1>__bootstrap_reference_data.sql
    |
    v
V<BASELINE+2>__backfill_personal_billing_accounts.sql
```

This separation is important for existing-database adoption.

An existing database can be explicitly baselined at the structural version, then still execute the later safe reference/backfill migrations.

---

## 11. Structural Baseline Design

### 11.1 Do not copy `schema.sql` verbatim

The historical `schema.sql` is a cumulative convergence script. It mixes:

- final `CREATE TABLE` definitions;
- historical `ALTER TABLE` statements;
- duplicate safety guards;
- seed DML;
- backfills;
- destructive cleanup of old tables.

The Flyway structural baseline must instead describe the intended final structural state directly.

### 11.2 Baseline should be strict

For a fresh database, prefer:

```sql
CREATE TABLE users (...);
CREATE UNIQUE INDEX uq_users_username_nocase ON users (LOWER(username));
```

not:

```sql
CREATE TABLE IF NOT EXISTS users (...);
CREATE UNIQUE INDEX IF NOT EXISTS ...;
```

A fresh baseline should fail if unexpected objects already exist. Defensive guards can hide incorrect database state.

### 11.3 Objects that must be represented

The baseline must include the current structural contract for at least:

- `users`;
- `roles`;
- `user_roles`;
- `lobbies`;
- `lobby_members`;
- `lobby_invites`;
- `tasks`;
- `events`;
- `calendar_feed_tokens`;
- user/lobby notification preferences;
- `notifications`;
- `notification_deliveries`;
- `idempotency_requests`;
- `password_reset_tokens`;
- `auth_sessions`;
- `auth_refresh_tokens`;
- `billing_accounts`;
- `billing_plans`;
- `billing_prices`;
- `billing_provider_customers`;
- `billing_subscriptions`;
- `feature_flags`.

### 11.4 PostgreSQL-specific invariants to preserve

Examples include:

```text
users username/email case-insensitive uniqueness via LOWER(...)
roles case-insensitive uniqueness via LOWER(name)
pending lobby invite partial uniqueness
active calendar feed token partial uniqueness
notification business-key partial uniqueness
idempotency requester/operation/key uniqueness
active billing subscription partial uniqueness
billing CHECK constraints
feature flag environment CHECK + key/environment uniqueness
foreign-key ON DELETE behavior
TIMESTAMPTZ semantics
BIGSERIAL/sequence ownership
```

### 11.5 Legacy destructive drops

Do not place historical statements such as:

```sql
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS user_subscriptions;
```

into a clean fresh-database baseline simply because they existed in `schema.sql`.

For an existing database:

- if a legacy table does not exist, no action is needed;
- if it exists and is empty/obsolete, removal must be an explicit reviewed migration or runbook decision;
- if it contains data, stop adoption and decide whether to transform, archive, or retain it.

---

## 12. Reference Data Strategy

### 12.1 Versioned bootstrap, not repeatable reset

Initial application-required reference data should live in a normal versioned migration.

Examples:

- `ROLE_USER`;
- `ROLE_ADMIN`;
- billing plan catalog rows `FREE` and `PRO`;
- current sandbox billing price rows if they are part of the current contract;
- initial feature-flag rows for supported environments.

### 12.2 Preserve operator-mutated state

Feature flags are mutable runtime/operator state. The migration may insert missing initial rows, but it must not overwrite `enabled`, audit values, or later operator choices on every startup.

Use insert-only semantics such as:

```sql
INSERT ... ON CONFLICT (...) DO NOTHING;
```

Do not use repeatable migrations for feature-flag resets.

### 12.3 Billing catalog

Flyway adoption must preserve current product semantics. Do not redesign real provider IDs during the migration project.

The use of sandbox provider IDs in production is a separate business/deployment decision that must be resolved before real billing launch.

---

## 13. Data Backfill Strategy

### 13.1 Initial bounded backfill

The existing personal billing-account backfill is suitable as a versioned Flyway data migration because it is deterministic and bounded for the current product scale:

```text
for every existing user
    ensure PERSONAL ACTIVE billing account exists
```

### 13.2 When not to use Flyway for a large backfill

Do not put a potentially long-running domain migration into startup Flyway when it is:

- massive;
- slow enough to exceed deployment windows;
- dependent on external services;
- difficult to make restart-safe;
- operationally observable as a long background process;
- coupled to complex business decisions.

Use expand-and-contract with an application/background backfill instead.

---

## 14. Existing Database Adoption

An existing non-empty database must not simply run the structural baseline.

### 14.1 Required workflow

```text
Existing database
    |
    v
Backup / snapshot
    |
    v
Identify application commit + PostgreSQL major
    |
    v
Build scratch expected DB from Flyway structural baseline
    |
    v
Compare existing DB with expected DB
    |
    +-- tables / columns / types
    +-- nullability / defaults
    +-- PK / FK / delete actions
    +-- unique / CHECK constraints
    +-- indexes / expressions / predicates
    +-- sequences / ownership / next values
    +-- critical data invariants
    |
    v
Any unexplained drift?
   / \
 yes  no
 |     |
STOP   v
      Explicit Flyway baseline at structural version
              |
              v
      Run post-baseline migrations
              |
              v
      Hibernate validate
              |
              v
      Application smoke tests
```

### 14.2 Baseline point

Baseline only at the structural baseline migration version.

Do **not** baseline past reference/bootstrap or data-backfill migrations, because those should run on adopted databases too.

### 14.3 Drift checks

Compare at least:

- table presence;
- column types;
- nullability;
- defaults;
- primary keys;
- foreign keys and `ON DELETE` actions;
- unique constraints;
- check constraints;
- ordinary indexes;
- expression indexes;
- partial-index predicates;
- sequences and ownership;
- sequence next values versus current maximum IDs.

### 14.4 Critical data-invariant checks

Before baselining, verify data does not violate the intended contract, including:

- duplicate usernames ignoring case;
- duplicate emails ignoring case;
- duplicate role names ignoring case;
- more than one pending invite for the same lobby/invitee pair;
- more than one active calendar feed token per user;
- duplicate idempotency keys for the same requester/operation;
- duplicate non-null notification business keys;
- multiple active-like billing subscriptions for one billing account;
- invalid billing period/check-constraint combinations;
- invalid feature-flag environments or duplicate key/environment rows;
- null/invalid privacy visibility values.

### 14.5 Stop conditions

Stop and resolve before baselining if:

- a required object is missing;
- an unexplained extra object changes behavior;
- a critical constraint/index differs;
- data violates an intended constraint;
- legacy tables contain data whose disposition is unknown;
- sequence state could cause identity collisions.

---

## 15. Fresh Database Flow

A fresh database must need no Hibernate DDL and no legacy `schema.sql`.

```text
Empty PostgreSQL
    |
    v
Flyway creates flyway_schema_history
    |
    v
Structural baseline
    |
    v
Reference bootstrap
    |
    v
Safe initial backfills
    |
    v
Future migrations
    |
    v
Hibernate validate
    |
    v
Application ready
```

Restarting the application must execute zero already-applied migrations.

---

## 16. Transaction and Failure Policy

### 16.1 Default

Use one transaction per migration where PostgreSQL permits it.

Do not enable broad migration grouping by default.

### 16.2 Failure behavior

A failed required migration means the release is not ready.

The application must not continue by falling back to Hibernate `update`.

For a transactional migration failure:

- transaction rolls back;
- fix the migration if it has not been successfully applied in a persistent shared environment, otherwise create a forward-fix migration;
- rerun validation/migration.

### 16.3 Non-transactional operations

Operations such as `CREATE INDEX CONCURRENTLY` cannot run in a normal transaction.

When needed:

1. isolate the operation in its own migration;
2. configure that migration as non-transactional via Flyway script configuration;
3. deploy it through a controlled migration job/window;
4. define cleanup/retry behavior for partial failure;
5. do not mix unrelated DDL into that file.

Do not add concurrent-index machinery until a real large-table need exists.

---

## 17. Locking and Multi-Instance Behavior

Flyway locking protects against two instances applying the same migration concurrently. It does **not** make old and new application versions schema-compatible.

Therefore two separate concerns exist:

```text
Flyway lock
  -> one migration executor at a time

Expand/contract schema design
  -> old and new app versions can coexist during rollout
```

For the initial small/single-replica production deployment, application-startup Flyway is acceptable.

Before normal production uses multiple replicas, long migrations, or non-transactional migrations, move migration execution to a dedicated deployment job.

---

## 18. Expand-and-Contract Rules

### 18.1 Adding a required column

Do not immediately add a non-null column that only the new application understands.

Preferred flow:

```text
Release A migration: add nullable/default-compatible column
Release A app: dual-write/read fallback
Backfill
Release B migration: enforce NOT NULL/constraint
Release C: remove old compatibility path if needed
```

### 18.2 Renaming a column

Prefer add-new + dual-read/write + backfill + later remove-old, rather than direct rename during a rolling deployment.

### 18.3 Removing a column/table

Remove only after:

- no deployed application reads/writes it;
- rollback window has passed;
- data-retention requirements are satisfied.

### 18.4 Enums/check constraints

Expand accepted values before deploying writers of the new value.

Contract obsolete values only after old writers/readers are gone.

### 18.5 Existing privacy migration example

The `events.shared` to `visibility` transition is a good example of why schema compatibility matters. Flyway adoption must preserve the current compatibility window rather than prematurely deleting the legacy field.

---

## 19. Rollback Strategy

Database migration rollback is not primarily `undo the SQL`.

The default strategy is:

1. design migrations to be backward-compatible with the previous application during rollout;
2. if application deployment fails, roll back the application while keeping compatible expanded schema;
3. fix schema problems with a forward migration;
4. use database restore/PITR only for destructive corruption or unrecoverable data loss.

`flyway repair` is not a rollback mechanism. Use it only for explicitly understood metadata repair scenarios.

---

## 20. Database Roles and Privileges

### 20.1 Initial launch

A single database user may be tolerated for the first simple launch if deployment complexity must remain low.

### 20.2 Hardened target

Later split responsibilities:

```text
migration role
  -> CREATE / ALTER / DROP / index / constraints / Flyway history ownership

application role
  -> SELECT / INSERT / UPDATE / DELETE / required sequence usage
  -> no schema-changing privileges
```

This separation becomes required before the dedicated multi-replica migration-job architecture is considered complete.

---

## 21. PostgreSQL Version Contract

The repository currently contains version drift across environments. The migration system needs one explicit primary contract.

Initial recommendation: **PostgreSQL 16**, because the dedicated integration/concurrency Testcontainers suite already uses PostgreSQL 16 and adopting Flyway should not simultaneously force a major-version migration.

Before launch:

1. choose the actual production PostgreSQL major;
2. run migration/schema-contract CI against that exact major;
3. align local/research/runtime documentation or explicitly document intentional differences;
4. treat a later PostgreSQL major upgrade as a separate infrastructure/migration project.

---

## 22. Testing Architecture

### 22.1 H2 responsibility

H2 remains for fast tests where PostgreSQL-specific DDL is not the subject.

Flyway is disabled there and Hibernate `create-drop` supplies the test schema.

H2 does **not** prove:

- migration syntax;
- partial/expression indexes;
- PostgreSQL check constraints;
- catalog structure;
- PostgreSQL locking/transaction behavior.

### 22.2 PostgreSQL integration responsibility

The existing `integrationTest` source set should start an empty PostgreSQL 16 Testcontainer and prove:

```text
empty DB -> Flyway all migrations -> Hibernate validate -> HTTP flows
```

### 22.3 Dedicated migration tests

Add a dedicated `migrationTest` source set/task for database migration semantics that should not be mixed into every ordinary unit test.

Required scenarios:

1. **Fresh database migration**
   - empty PostgreSQL;
   - apply all migrations;
   - assert latest version reached.

2. **Hibernate compatibility**
   - after migration, start/construct Hibernate with `ddl-auto=validate`;
   - validation succeeds without mutation.

3. **Idempotent restart**
   - migrate once;
   - migrate again;
   - zero pending migrations; no data reset.

4. **Transactional failure**
   - use a test-only deliberately broken migration/location;
   - verify failure blocks completion and transactional effects roll back.

5. **N -> latest upgrade**
   - create representative older schema/data state;
   - apply later migrations;
   - verify data preserved/transformed correctly.

6. **Legacy adoption**
   - load a frozen pre-Flyway legacy fixture or reproduce the verified cutover state;
   - explicitly baseline structural version;
   - apply post-baseline migrations;
   - verify data remains.

7. **PostgreSQL-only contract assertions**
   - expression indexes;
   - partial indexes and predicates;
   - critical checks;
   - foreign-key delete actions;
   - sequence ownership/identity generation.

8. **Feature-flag preservation**
   - modify an existing flag value;
   - rerun migration validation/startup;
   - operator state remains unchanged.

9. **Billing-account backfill**
   - legacy user without account receives one;
   - existing account is not duplicated.

10. **BIGSERIAL/JPA generation**
    - insert generated-ID entities after migrations and after representative seeded IDs;
    - no sequence collision.

### 22.4 Schema-contract tests

`ddl-auto=validate` is necessary but insufficient.

Use `pg_catalog`, `information_schema`, or PostgreSQL helper functions to assert critical objects that JPA cannot represent.

Examples:

```text
uq_users_username_nocase uses lower(username)
uq_lobby_pending_invite has WHERE status = 'PENDING'
uq_calendar_feed_tokens_user_active has WHERE revoked_at IS NULL
uq_billing_subscriptions_active has expected status predicate
billing CHECK constraints exist
foreign keys have expected delete actions
```

---

## 23. CI Requirements

Target backend verification sequence:

```bash
./gradlew check
./gradlew migrationTest
./gradlew integrationTest
./gradlew jacocoTestReport
```

### 23.1 Historical migration immutability guard

CI should reject changes to migration files already present on the merge base/main history unless an explicit exceptional workflow approves it.

Preferred rule:

- historical `V*.sql` files are immutable;
- feature branches may add new versions;
- editing an existing migration requires explicit review and should normally be rejected.

### 23.2 Migration version freshness guard

CI should verify each new migration version is greater than the latest migration version on updated `main`.

This preserves `outOfOrder=false` while allowing parallel development through timestamp naming.

### 23.3 Fresh-database gate

At least one CI path must always start from a truly empty PostgreSQL database. Reusing a developer database is not proof of migration completeness.

---

## 24. Observability and Operational Behavior

At startup/deployment, Flyway logs should make visible:

- current schema version;
- pending migrations;
- each applied migration;
- success/failure;
- execution duration.

`flyway_schema_history` becomes the authoritative answer to:

> What migration state is this database in?

If Actuator exposes Flyway information, keep it behind the same production exposure/security rules as other sensitive operational endpoints. Public health should not leak migration details.

A migration failure must prevent readiness for a release that requires that migration.

---

## 25. `schema.sql` Retirement

After atomic Flyway cutover:

- `spring.sql.init.mode=never` for PostgreSQL runtime;
- no `spring.sql.init.schema-locations=classpath:database/schema.sql` reference remains;
- production `database/schema.sql` is removed from runtime resources;
- if a pre-Flyway fixture is needed for migration tests, store a frozen test-only fixture with an explicit legacy name and purpose;
- documentation must stop instructing agents/developers to modify `schema.sql`.

Future schema changes go only into new Flyway migration files.

---

## 26. Initial Rollout Strategy

### Fresh disposable local database

Prefer recreation:

1. stop application;
2. drop/recreate local database or container volume if data is disposable;
3. start Flyway-enabled application;
4. verify all migrations applied;
5. verify Hibernate validation and smoke flows.

### Valuable existing local/staging/production database

Do not recreate.

Follow the explicit adoption runbook in Section 14.

### First production launch

If Lined production is still single-replica and migrations are small/transactional:

```text
backup/snapshot
    -> deploy application
    -> startup Flyway migrate
    -> Hibernate validate
    -> readiness
    -> smoke tests
```

Before scaling replicas or adding long/non-transactional migrations, implement DB-MIG-09.

---

## 27. Risk Register

| Risk | Severity | Mitigation |
|---|---:|---|
| Hibernate silently mutates production schema | Critical | `ddl-auto=validate`; Flyway owns DDL |
| `schema.sql` reruns historical operations | Critical | SQL init disabled; retire runtime script |
| Two active schema owners | Critical | Flyway only + Hibernate validate |
| Existing DB is baselined despite drift | Critical | explicit comparison; `baselineOnMigrate=false` |
| H2 hides PostgreSQL constraint/index problems | High | PostgreSQL migration/schema-contract tests |
| Baseline loses PostgreSQL-only indexes/checks | High | explicit inventory + `pg_catalog` tests |
| Feature bootstrap resets operator state | High | versioned insert-only DML; no repeatable reset |
| Legacy destructive drops delete valuable data | High | exclude from clean baseline; explicit adoption decision |
| Rolling deployment breaks old app | High | expand-and-contract rules |
| Non-transactional index fails partially | High | isolated migration + controlled job/runbook |
| Migration file edited after application | High | checksums + immutable-history CI |
| Out-of-order branch migration is skipped | Medium | timestamp naming + freshness guard + rebase |
| PostgreSQL version differs across environments | Medium/High | choose production major and test exact version |
| Multiple replicas race migration/startup | Medium | Flyway lock initially; dedicated migration job later |
| Runtime user retains DDL privileges | Medium | split migration/runtime DB roles later |
| Flyway work bundles unrelated Java/toolchain change | Medium | preserve Java 21/Spring Boot 3.5.6/Gradle 8.14.3 |

---

# 28. Implementation Plan

The following DB-MIG tasks are the execution contract. Prefer one focused PR per task unless a task explicitly allows atomic combination.

---

## DB-MIG-00 — Freeze and Audit Cutover Baseline

**Objective:** establish the exact schema contract that Flyway must reproduce before changing ownership.

**Steps**

1. Record current `main` commit and PostgreSQL versions used by runtime/tests.
2. Inventory every table, column, default, PK, FK, delete action, unique/check constraint, index, expression/partial predicate, and sequence represented by current `schema.sql` plus live JPA expectations.
3. Classify every `schema.sql` statement as:
   - final structural state;
   - historical evolution only;
   - reference bootstrap;
   - data backfill;
   - legacy destructive cleanup.
4. Identify JPA/SQL mismatches that Hibernate validation cannot detect.
5. Freeze a legacy fixture/schema snapshot for adoption testing if needed.
6. Do not change product behavior.

**Acceptance criteria**

- structural inventory is complete;
- destructive historical statements are identified;
- data/reference statements are separated from DDL;
- no unresolved critical schema object is omitted from baseline design.

---

## DB-MIG-01 — Add Flyway Dependencies in Transitional Mode

**Objective:** introduce required dependencies without accidentally creating two competing migration paths during an incomplete cutover.

**Changes**

```gradle
implementation 'org.flywaydb:flyway-core'
runtimeOnly 'org.flywaydb:flyway-database-postgresql'
```

**Rules**

- use Spring Boot dependency management;
- do not add Liquibase;
- do not add Flyway Gradle plugin initially;
- if DB-MIG-01 is merged alone, keep Flyway disabled until baseline/data migrations exist;
- DB-MIG-01 through DB-MIG-04 may instead be implemented in one atomic PR so there is never a broken intermediate runtime state.

**Acceptance criteria**

- project resolves Flyway dependencies on Java 21;
- no schema ownership change occurs unless atomic DB-MIG-02/03/04 is included.

---

## DB-MIG-02 — Build Clean Structural Baseline

**Objective:** create the strict current-state PostgreSQL schema migration.

**File**

```text
src/main/resources/db/migration/V<timestamp>__baseline_schema.sql
```

**Steps**

1. Reconstruct final table definitions directly.
2. Include all required PK/FK/check/unique/index/partial/expression semantics.
3. Preserve `BIGSERIAL` generation.
4. Preserve current privacy compatibility fields.
5. Do not include reference DML.
6. Do not include billing-account backfill.
7. Do not include historical `DROP TABLE` cleanup.
8. Avoid broad `IF NOT EXISTS` guards.

**Tests**

- fresh PostgreSQL can apply baseline;
- critical schema objects exist;
- Hibernate validation succeeds when reference dependencies do not affect schema validation.

**Acceptance criteria**

- empty DB reaches the intended structural state;
- baseline represents final state rather than historical convergence steps;
- PostgreSQL-only invariants are preserved.

---

## DB-MIG-03 — Add Reference Bootstrap and Safe Initial Backfills

**Objective:** separate required data initialization from structural baselining.

**Files**

```text
V<timestamp>__bootstrap_reference_data.sql
V<timestamp>__backfill_personal_billing_accounts.sql
```

**Reference migration requirements**

- insert built-in roles if missing;
- insert current billing plan/price catalog if missing;
- insert initial feature flags if missing;
- never overwrite existing feature-flag/operator state.

**Backfill requirements**

- ensure one PERSONAL ACTIVE billing account per existing user;
- do not duplicate existing account rows;
- deterministic and restart-safe through uniqueness/existence checks.

**Acceptance criteria**

- fresh DB receives required bootstrap rows;
- existing modified feature flags remain unchanged;
- existing billing accounts are preserved;
- missing personal accounts are created exactly once.

---

## DB-MIG-04 — Atomic Runtime Ownership Cutover

**Objective:** make Flyway the only PostgreSQL schema-evolution owner.

**Required configuration**

```properties
spring.sql.init.mode=never
spring.jpa.hibernate.ddl-auto=validate
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration
spring.flyway.default-schema=public
spring.flyway.baseline-on-migrate=false
spring.flyway.validate-on-migrate=true
spring.flyway.validate-migration-naming=true
spring.flyway.out-of-order=false
spring.flyway.clean-disabled=true
spring.flyway.fail-on-missing-locations=true
```

**Steps**

1. Switch default PostgreSQL runtime to Flyway + validate.
2. Ensure prod inherits/sets the same safe ownership rules.
3. Change integration profile to Flyway + validate + SQL init disabled.
4. Keep H2 test profile Flyway-disabled with `create-drop`.
5. Remove `schema.sql` runtime reference.
6. Remove production `schema.sql` after a legacy test fixture is captured if needed.
7. Update architecture/testing docs.

**Acceptance criteria**

- no PostgreSQL runtime path uses `ddl-auto=update/create/create-drop`;
- no PostgreSQL runtime path executes legacy `schema.sql`;
- fresh integration Testcontainer migrates before Hibernate validation;
- application fails rather than self-repairing if schema is wrong.

---

## DB-MIG-05 — Add Migration and Schema-Contract Tests

**Objective:** make migration correctness a first-class CI gate.

**Changes**

- add `migrationTest` source set/task;
- use PostgreSQL 16 Testcontainers initially;
- add fresh DB, restart, failure, upgrade, legacy adoption, and `pg_catalog` assertions.

**Required scenarios**

- empty -> latest;
- Hibernate validate;
- second migrate is no-op;
- transactional failure rollback;
- N -> latest data preservation;
- legacy baseline adoption;
- partial/expression index assertions;
- CHECK/FK assertions;
- feature flag preservation;
- billing account backfill;
- generated IDs/sequences.

**Acceptance criteria**

- tests fail when critical PostgreSQL schema semantics are missing;
- H2 is not used as migration proof;
- reports are available under Gradle test-report directories.

---

## DB-MIG-06 — Existing Database Baseline Runbook

**Objective:** document and test the operator procedure for adopting Flyway on a valuable non-empty database.

**Runbook must include**

1. maintenance/deployment window decision;
2. backup/snapshot;
3. application commit and DB-major identification;
4. scratch expected DB creation;
5. schema/catalog comparison;
6. data invariant queries;
7. stop conditions;
8. explicit baseline at structural migration version;
9. post-baseline migrate;
10. Hibernate validation;
11. application smoke tests;
12. recording application and schema versions.

**Acceptance criteria**

- no `baselineOnMigrate=true` shortcut;
- operator can distinguish fresh DB from existing DB procedure;
- legacy adoption has a tested fixture/path;
- data preservation is verified.

---

## DB-MIG-07 — CI Guards and Developer/Agent Documentation

**Objective:** prevent future regression to unmanaged schema changes.

**Steps**

1. Run `migrationTest` in CI.
2. Run full HTTP `integrationTest` against Flyway-created PostgreSQL.
3. Add immutable historical-migration guard.
4. Add migration-version freshness guard.
5. Update `docs/README.md`, `docs/CONTEXT.md`, `docs/foundation/architecture.md`, and `docs/foundation/testing.md`.
6. Update `backend/lined/AGENTS.md` and root `AGENTS.md` so agents are told:
   - Flyway owns schema;
   - new changes require new versioned migration;
   - Hibernate validates only;
   - H2 is not authoritative;
   - this system-design document is mandatory reading for persistence changes.
7. Document developer workflows for fresh local DB and valuable existing DB.

**Acceptance criteria**

- no authoritative docs still instruct developers to edit `database/schema.sql` or rely on Hibernate update;
- CI prevents mutation of applied migration history;
- Codex routing points to this design.

---

## DB-MIG-08 — Production Rollout Verification and PostgreSQL Alignment

**Objective:** prove the migration architecture in the actual deployment contract.

**Steps**

1. Choose production PostgreSQL major.
2. Align the primary migration CI container to that major.
3. Validate environment overrides cannot re-enable unsafe schema mutation.
4. For a fresh production DB, migrate from empty.
5. For an existing production DB, execute DB-MIG-06 runbook.
6. Verify latest Flyway history version.
7. Verify Hibernate validation/readiness.
8. Run product smoke tests.
9. Record schema version + application version.

**Acceptance criteria**

- production DB state is represented in `flyway_schema_history`;
- release starts with `ddl-auto=validate`;
- no legacy SQL-init path remains;
- exact PostgreSQL major is tested/documented.

---

## DB-MIG-09 — Dedicated Migration Job and Split DB Roles

**Objective:** harden deployment before Flyway startup execution becomes unsafe operationally.

**Trigger before any of:**

- normal production replica count greater than one;
- first long-running migration;
- first non-transactional/concurrent-index migration;
- security policy forbids application DDL privileges.

**Steps**

1. create migration DB role;
2. create DML-only application role;
3. create deployment migration job using the same release artifact/migration set;
4. gate app rollout on successful migration job;
5. disable Flyway migration execution in application replicas while retaining Hibernate validation;
6. prove runtime user cannot execute DDL.

**Acceptance criteria**

- exactly one controlled migration executor;
- application replicas cannot mutate schema;
- migration failure blocks rollout;
- old/new application compatibility follows expand-and-contract rules.

---

## 29. Acceptance Criteria for the Flyway System

The Flyway migration system is accepted when all of the following are true:

1. `schema.sql` is not executed by normal local PostgreSQL, integration, staging, or production startup.
2. Hibernate cannot mutate PostgreSQL schema in those environments.
3. PostgreSQL runtime uses `ddl-auto=validate`.
4. All schema evolution is represented by versioned SQL under `db/migration`.
5. Flyway PostgreSQL support is present and version-managed by Spring Boot.
6. Empty PostgreSQL migrates to latest successfully.
7. Hibernate validates the migrated schema.
8. Restarting against latest schema applies zero migrations.
9. A broken required migration prevents readiness.
10. N -> latest upgrade preserves representative data.
11. Existing legacy database adoption is documented and tested.
12. `baselineOnMigrate=false` remains policy.
13. Critical PostgreSQL-only indexes/constraints are asserted in tests.
14. Mutable feature-flag state is never reset by ordinary startup/migration validation.
15. Historical migration modification is blocked by CI/review policy.
16. Parallel-branch migration versions cannot silently execute out of order.
17. Production PostgreSQL major is explicit in CI.
18. Existing valuable DB rollout requires a recovery point before adoption/destructive changes.
19. Java 21/Spring Boot 3.5.6/Gradle 8.14.3 remain unchanged unless a separate approved task changes them.

---

## 30. Definition of Done

For the initial single-replica launch, the migration project is done when:

- required tasks DB-MIG-00 through DB-MIG-08 are complete;
- CI is green from a clean checkout;
- `migrationTest` and `integrationTest` validate the production PostgreSQL contract;
- documentation and agent instructions identify Flyway as the only schema owner;
- fresh and legacy-baselined databases reach the same intended schema;
- no production code path performs implicit schema mutation;
- persistent environments have valid `flyway_schema_history` state;
- the team can identify DB schema version from Flyway history;
- DB-MIG-09 is implemented before the stated scaling/long-migration triggers.

---

## 31. Production Rollout Checklist

### Before rollout

- [ ] Confirm release commit and migration files.
- [ ] Confirm Java 21 baseline is unchanged.
- [ ] Confirm production PostgreSQL major.
- [ ] Run backend quality gates, `migrationTest`, and `integrationTest`.
- [ ] Confirm no historical migration was modified.
- [ ] Review new migration SQL for locks and expected data volume.
- [ ] Confirm `baselineOnMigrate=false`.
- [ ] Confirm `spring.sql.init.mode=never`.
- [ ] Confirm PostgreSQL runtime `ddl-auto=validate`.
- [ ] Confirm Flyway clean is disabled.
- [ ] Confirm backup/snapshot for an existing valuable DB.

### Existing DB only

- [ ] Build scratch expected DB from structural baseline.
- [ ] Compare schema/catalog.
- [ ] Run data-invariant checks.
- [ ] Resolve every unexplained drift item.
- [ ] Explicitly baseline at structural migration version.
- [ ] Run post-baseline migrations.

### Deployment

- [ ] Validate/migrate with Flyway.
- [ ] Confirm latest expected schema version.
- [ ] Confirm no failed migration state.
- [ ] Start/deploy application.
- [ ] Confirm Hibernate validation succeeds.
- [ ] Confirm health/readiness.
- [ ] Run auth/user/lobby/task/calendar/billing smoke flows appropriate to the release.

### After deployment

- [ ] Record application version + schema version.
- [ ] Review migration durations/logs.
- [ ] Confirm no unexpected pending migration.
- [ ] Retain recovery point according to deployment backup policy.

---

## 32. Resolved Architecture Decisions

- Migration engine: **Flyway**.
- Migration language: **explicit PostgreSQL SQL**.
- Structural owner: **Flyway**.
- PostgreSQL JPA schema behavior: **validate only**.
- Spring SQL initialization: **disabled for application schema**.
- Existing DB adoption: **explicit verification + manual baseline**.
- `baselineOnMigrate`: **false**.
- Fresh DB: **execute full migration history**.
- Initial baseline: **normal versioned migration**, not a Flyway `B...` baseline migration.
- Repeatable migrations: **none initially**.
- Naming: **UTC timestamp versions**.
- Out-of-order execution: **disabled**.
- Rollback: **backward-compatible app rollback + forward-fix; restore for destructive corruption**.
- Initial production executor: **application-start Flyway acceptable for one small replica**.
- Long-term production executor: **dedicated migration job**.
- H2: **non-authoritative; Flyway disabled**.
- Authoritative migration engine test: **PostgreSQL Testcontainers**.
- Initial recommended PostgreSQL major: **16**, pending production-platform confirmation.
- Java baseline: **Java 21**.

---

## 33. Open Deployment Decisions

These do not change the migration model but must be resolved before production rollout:

1. Does a staging/production database already exist with irreplaceable data?
2. Which exact managed PostgreSQL major will production use?
3. Are current sandbox billing provider price IDs intentionally allowed in production catalog rows before a real billing provider is enabled?
4. What production deployment primitive will Lined use when DB-MIG-09 is implemented: single container/VM, ECS, Kubernetes, Railway, or another platform?

---

## 34. Agent Safety Rules

A Codex implementation agent must not:

1. change unrelated business behavior while introducing Flyway;
2. change Java/Spring/Gradle/PostgreSQL major as an incidental refactor;
3. copy legacy `schema.sql` byte-for-byte as the baseline;
4. enable `baselineOnMigrate`;
5. use Hibernate `update` as a fallback for incomplete migrations;
6. make the baseline broadly idempotent with `IF NOT EXISTS`;
7. silently drop legacy tables during baseline adoption;
8. remove PostgreSQL expression/partial indexes or CHECK constraints;
9. add speculative indexes;
10. overwrite mutable feature-flag state in repeatable/reference migrations;
11. edit an already-applied historical migration to fix a later problem;
12. claim H2 proves migration correctness;
13. bypass the dependency/task ordering in this document without recording and reviewing the reason.

The invariant to preserve in code, configuration, tests, and documentation is:

```text
Flyway owns schema evolution.
Hibernate validates schema.
Application code does not silently mutate production schema.
```

---

## 35. Repository Evidence Used for This Design

The design was derived from the Lined repository, including:

- root and backend `AGENTS.md` files;
- backend documentation routing/context;
- foundation architecture/testing documentation;
- backend `build.gradle` and Gradle wrapper;
- main/test/integration Spring configuration;
- legacy `src/main/resources/database/schema.sql`;
- JPA mappings across user, role, lobby, task, event, notification, auth, idempotency, billing, and feature-flag domains;
- PostgreSQL Testcontainers integration/schema/concurrency tests;
- Docker/Kubernetes/local database artifacts;
- backend CI workflow.

This document should be refreshed when those foundations materially change.

---

## 36. Final Principle

Old model:

```text
schema.sql
   +
Hibernate update
   +
historical database state
        |
        v
unclear schema ownership
```

Target model:

```text
Git migration
    |
    v
Flyway
    |
    v
PostgreSQL
    |
    v
Hibernate validate
    |
    v
Application
```

**Exactly one mechanism is allowed to evolve the Lined production schema: the reviewed, version-controlled Flyway migration chain.**
