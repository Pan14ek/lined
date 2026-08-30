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

The backend is moving away from its MVP identity model. `POST /api/auth/login`
now verifies a user's stored password and returns a short-lived Bearer-style
token plus the authenticated user identity. A stateless Spring Security
boundary protects every non-public HTTP route, while the approved registration,
authentication/reset, feature-discovery, and health routes remain public.
Bearer-token decoding is deferred to AUTH-SEC-02, so private routes cannot yet
authenticate; existing `X-User-Id: <Long>` controller contracts remain a
deprecated transitional identity model for the later trusted-identity migration.

Swagger UI is available at `/swagger-ui.html` when the app is running.

## Persistence Model

- PostgreSQL is the target runtime database.
- H2 is used for tests.
- Schema bootstrap lives in `src/main/resources/database/schema.sql`.
- JPA uses `ddl-auto=update`.
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

- Request authentication is transitional: login verifies passwords and returns a
  token, but JWT decoding and trusted identity propagation arrive in later
  authentication-security slices. The current default-deny boundary therefore
  rejects private requests until AUTH-SEC-02 supplies Bearer authentication.
- Some service code still throws raw Java exceptions such as
  `NoSuchElementException`, `IllegalArgumentException`, or `SecurityException`.
  Prefer the application exception hierarchy for new work.
- The current backend has observability dependencies and Actuator settings, but
  the full experiment telemetry stack is not yet defined.
- Docker and Kubernetes artifacts are not part of this documentation foundation
  task and should be added in later `experiment/*` branches.
