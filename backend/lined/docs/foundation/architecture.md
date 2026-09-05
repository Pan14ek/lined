# Backend Architecture

## Purpose

The Lined backend is a Spring Boot REST API for schedule coordination, shared
tasks, and group planning. It is also the stable case-study system for the
research experiment on adaptive multi-objective fitness functions.

The backend should remain a single Spring Boot application during the first
experiment phase. Experiment work should adapt deployment, telemetry, and
runtime configuration around the current backend rather than rewriting the
application.

## Module Layout

Root package: `io.backend.lined`

Domain modules follow a three-layer structure:

```text
{module}/
  api/       Controller, DTO records, MapStruct mapper
  domain/    JPA entity, repository, enum types
  service/   Service interface and service implementation
```

Current domain modules:

| Module         | Responsibility                                                         |
|----------------|------------------------------------------------------------------------|
| `user`         | User accounts, profile data, search, role and subscription projection. |
| `lobby`        | Shared group spaces for couples, families, friends, or work groups.    |
| `task`         | Shared tasks, assignees, statuses, and due dates inside lobbies.       |
| `event`        | Calendar events, shared schedule data, and conflict checks.            |
| `plan`         | Subscription plan catalog.                                             |
| `subscription` | User subscription history and active-plan state.                       |
| `role`         | Role catalog and role assignment.                                      |

Supporting packages:

| Package            | Responsibility                                                          |
|--------------------|-------------------------------------------------------------------------|
| `app`              | Application-level orchestration across modules.                         |
| `common`           | Shared utility code such as entity lookup helpers.                      |
| `common.exception` | Application exception hierarchy and API error types.                    |
| `config`           | Spring configuration, exception handling, OpenAPI, and security config. |

## Layering Rules

Use this dependency direction:

```text
Controller -> Service -> Repository -> Entity
```

- Controllers translate HTTP requests into service calls and DTO responses.
- Services own business rules, authorization checks, validation that depends on
  loaded entities, and transaction boundaries.
- Repositories only express persistence access.
- Entities model persisted state and relationships.
- DTOs are API contracts and should not leak JPA entities.

## API and Identity Model

The authenticated identity model is implemented with `POST /api/auth/login`,
which verifies a user's stored password and returns a short-lived Bearer JWT
plus the authenticated user identity. A stateless Spring Security boundary
protects every non-public HTTP route, while the approved registration,
authentication/reset, feature-discovery, and health routes remain public.
Bearer-token decoding is provided by the Spring Security resource-server
boundary. Caller-scoped controllers resolve the validated JWT subject through
the `CurrentUserProvider` security adapter; domain services continue to receive
trusted IDs as explicit framework-independent authorization inputs. The
client-controlled `X-User-Id` header is not an identity source.

Swagger UI is available at `/swagger-ui.html` when the app is running.

## Persistence Model

- PostgreSQL is the authoritative runtime database.
- Flyway owns PostgreSQL schema evolution through versioned SQL migrations in
  `src/main/resources/db/migration/`.
- Hibernate uses `ddl-auto=validate` for PostgreSQL runtimes and must never
  create or mutate the production schema.
- Spring SQL initialization is disabled for the application schema.
- H2 remains available for fast Spring/JPA tests; Flyway is disabled there and
  Hibernate uses `create-drop`. PostgreSQL/Testcontainers tests are the
  authoritative migration and database-contract checks.
- Applied Flyway migrations are immutable. Add a new versioned migration for
  every schema/data evolution; do not edit a migration that may have run in a
  persistent environment.
- `baseline-on-migrate` stays disabled. Existing non-empty databases require
  explicit schema verification and an operator-controlled Flyway baseline
  before the first Flyway-enabled deployment.
- Timestamp columns use `TIMESTAMPTZ`; Java code should use `OffsetDateTime`.
- Enum fields use `EnumType.STRING`.
- Associations should stay lazy unless there is a measured reason to change
  them.

## Architecture Ideas for the Experiment

Lined is useful as an experiment case because it already has real workflows:
users, lobbies, tasks, events, subscriptions, and roles. The first research
phase should compare deployment and runtime alternatives for this stable
application.

Candidate architecture/deployment alternatives:

| Alternative                  | What changes                                 | Why it matters                                          |
|------------------------------|----------------------------------------------|---------------------------------------------------------|
| Replica count                | Backend pod replicas.                        | Tests availability, throughput, and latency trade-offs. |
| Resource requests and limits | CPU and memory requests/limits.              | Supports cost and utilization objectives.               |
| HPA policy                   | Autoscaling thresholds and min/max replicas. | Tests autoscaling stability and SLO behavior.           |
| Probe configuration          | Readiness and liveness probe timing.         | Tests recovery and deployment stability.                |
| Telemetry pipeline           | Prometheus and OpenTelemetry collection.     | Enables runtime-aware fitness evaluation.               |
| Load profile                 | Baseline, spike, and sustained workloads.    | Provides runtime context for adaptive weighting.        |

## Known Inconsistencies and Risks

- Authentication verification and trusted identity propagation are implemented
  through the Spring Security Bearer boundary and `CurrentUserProvider`.
  Historical references to `X-User-Id` in migration records and spoofing tests
  describe the removed baseline and must not be copied into new product code.
- Some service code still throws raw Java exceptions such as
  `NoSuchElementException`, `IllegalArgumentException`, or `SecurityException`.
  Prefer the application exception hierarchy for new work.
- JPA metadata cannot express all PostgreSQL invariants used by Lined, including
  expression indexes and partial unique indexes. `ddl-auto=validate` is a
  mapping-compatibility check, not a replacement for PostgreSQL schema-contract
  tests.
- The current backend has observability dependencies and Actuator settings, but
  the full experiment telemetry stack is not yet defined.
- Docker and Kubernetes artifacts are not part of this documentation foundation
  task and should be added in later `experiment/*` branches.
