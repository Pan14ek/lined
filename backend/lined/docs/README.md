# Lined Backend Documentation

This directory is the documentation home for the Spring Boot backend and the
scientific experiment work based on it. Start here before making backend
changes.

| Name                | Description                                                                                                     | Path                  | When you should use it                                                                      | Cases for using                                                                          |
|---------------------|-----------------------------------------------------------------------------------------------------------------|-----------------------|---------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| Backend Agent Guide | Backend-specific instructions for coding agents.                                                                | `../AGENTS.md`        | Use before changing anything under `backend/lined/`.                                        | Commands, conventions, quality gates, experiment constraints.                            |
| Architecture Guide  | Backend modules, layers, domain boundaries, current architecture ideas, constraints, and known inconsistencies. | `architecture.md`     | Use before changing backend structure, adding modules, or refactoring.                      | Feature design, domain modeling, layering checks, architecture decisions.                |
| Testing Guide       | How backend tests are written and what new backend work must cover.                                             | `testing.md`          | Use before adding or changing backend tests.                                                | Unit tests, service tests, integration-test decisions, test naming and mocking patterns. |
| API Documentation   | Backend API reference moved from the legacy `documentation/` directory.                                         | `api.md`              | Use when changing endpoints, DTOs, request headers, or response behavior.                   | Endpoint review, API examples, Swagger/API alignment, client integration checks.         |
| Experiment Plan     | Detailed plan for adapting Lined to Kubernetes and runtime telemetry experiments for the article.               | `experiment-plan.md`  | Use before containerization, kind, Kubernetes, telemetry, load-test, or fitness-model work. | Research scope, experiment platform design, metrics, baselines, expected evidence.       |
| Experiment Tasks    | One-PR task table for iterative experiment implementation.                                                      | `experiment-tasks.md` | Use before starting an experiment branch or PR.                                             | Branch naming, PR scope, implementation order, final-work expectations.                  |

## Documentation Rules

- Keep backend documentation in this `docs/` directory.
- Update this index when adding, moving, or renaming backend documentation.
- Keep experiment work linked to `experiment-tasks.md`.
- Use English for backend agent and documentation files.
