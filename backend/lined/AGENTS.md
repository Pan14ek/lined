# AGENTS.md - Lined Backend

> Backend-specific instructions for AI coding agents.
> Read this file before changing anything under `backend/lined/`.

## Backend Role

`backend/lined/` is the Spring Boot REST API for Lined. It manages users,
lobbies, tasks, calendar events, plans, subscriptions, and roles. It is also
the empirical backend used for the scientific experiment on adaptive
multi-objective fitness functions.

Do not rewrite the backend for the experiment. Keep the current Spring Boot
application stable and adapt it incrementally for containerization,
Kubernetes, telemetry, load testing, and fitness-model evaluation.

## Documentation Routing

Use `docs/README.md` as the backend documentation index.

| Name | Description | Path | When you should use it | Cases for using |
| --- | --- | --- | --- | --- |
| Backend Docs Index | Routing table for all backend documentation. | `docs/README.md` | Start here when you need backend documentation context. | Choosing which document to read, checking docs coverage, adding new backend docs. |
| Architecture Guide | Backend modules, layers, domain boundaries, and known architecture notes. | `docs/architecture.md` | Before changing backend structure or adding a module. | New feature design, refactoring, checking layering, documenting architecture decisions. |
| Testing Guide | Backend test conventions, tools, and expectations. | `docs/testing.md` | Before writing or changing backend tests. | Unit tests, integration tests, service behavior coverage, Mockito patterns. |
| API Documentation | Current backend API reference. | `docs/api.md` | When changing endpoints, DTOs, or API behavior. | Request/response review, endpoint coverage, Swagger/API alignment. |
| Experiment Plan | Scientific experiment context and adaptation strategy. | `docs/experiment-plan.md` | Before experiment-related backend, Kubernetes, telemetry, or load-test work. | Containerization, kind deployment, runtime metrics, fitness-model extension. |
| Experiment Tasks | One-PR task table for iterative experiment work. | `docs/experiment-tasks.md` | Before starting an experiment implementation branch. | Branch planning, PR scope control, experiment roadmap tracking. |

## Commands

Run commands from `backend/lined/` unless noted otherwise.

```bash
./gradlew test
./gradlew check
./gradlew jacocoTestReport
./gradlew checkstyleMain
./gradlew spotbugsMain
./gradlew bootRun
```

Use `./gradlew sonarqube` only when `SONAR_TOKEN` is configured.

## Architecture Rules

- Keep the layer order: Controller -> Service -> Repository -> Entity.
- Controllers stay thin: validate input, call one service operation, return DTOs.
- Service implementations contain business logic and use `@Service`,
  `@RequiredArgsConstructor`, and `jakarta.transaction.Transactional`.
- Repositories are Spring Data access boundaries. Do not put business logic in
  repositories.
- DTOs are Java records with names such as `UserCreateDto`, `UserUpdateDto`,
  and `UserDto`.
- MapStruct mappers use `componentModel = "spring"` and explicit mappings for
  non-trivial fields.
- Persisted timestamps use `OffsetDateTime` and UTC semantics.
- JPA associations use `FetchType.LAZY`.

## Testing Rules

- Every new service behavior needs a corresponding unit test.
- Prefer JUnit 5, Mockito, and AssertJ for service-level tests.
- Use `@ExtendWith(MockitoExtension.class)`, `@Mock`, and `@InjectMocks` for
  unit tests.
- Do not introduce `@SpringBootTest` for simple service unit tests.
- Use H2-backed Spring tests only when Spring wiring or persistence behavior is
  the subject of the test.
- Do not delete tests to improve coverage metrics.

## Quality Gates

- Checkstyle violations fail the build.
- SpotBugs reports are generated in CI and uploaded as SARIF.
- JaCoCo line coverage feeds the fitness metrics collector.
- SonarCloud project key is `Pan14ek_lined`.
- The CI metrics collector stores pipeline-run quality metrics in Cosmos DB.

## Experiment Constraints

- Use one PR per task from `docs/experiment-tasks.md`.
- Use the `experiment/` branch prefix for scientific experiment work.
- Keep experiment changes reproducible and documented.
- Do not add product AI features as part of the first experiment phase.
- Do not split the backend into microservices unless a later experiment task
  explicitly requires a controlled architecture alternative.
- For Kubernetes/runtime work, preserve existing REST behavior and measure
  deployment/runtime differences rather than changing the product domain.
