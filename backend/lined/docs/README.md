# Lined Backend Documentation

This directory is the documentation home for the Spring Boot backend and the
scientific experiment work based on it. Start here before making backend
changes.

| Name                | Description                                                                                                     | Path                           | When you should use it                                                                      | Cases for using                                                                          |
|---------------------|-----------------------------------------------------------------------------------------------------------------|--------------------------------|---------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| Backend Agent Guide | Backend-specific instructions for coding agents.                                                                | `../AGENTS.md`                 | Use before changing anything under `backend/lined/`.                                        | Commands, conventions, quality gates, experiment constraints.                            |
| Architecture Guide  | Backend modules, layers, domain boundaries, current architecture ideas, constraints, and known inconsistencies. | `architecture.md`              | Use before changing backend structure, adding modules, or refactoring.                      | Feature design, domain modeling, layering checks, architecture decisions.                |
| Testing Guide       | How backend tests are written and what new backend work must cover.                                             | `testing.md`                   | Use before adding or changing backend tests.                                                | Unit tests, service tests, integration-test decisions, test naming and mocking patterns. |
| API Documentation   | Backend API reference moved from the legacy `documentation/` directory.                                         | `api.md`                       | Use when changing endpoints, DTOs, request headers, or response behavior.                   | Endpoint review, API examples, Swagger/API alignment, client integration checks.         |
| Containerization    | Docker image build and local container run flow for the Spring Boot backend.                                    | `containerization.md`          | Use before building or running the backend Docker image.                                    | Docker image creation, local container smoke checks, runtime environment variables.      |
| kind Baseline       | Local kind deployment flow for PostgreSQL and the backend baseline.                                             | `kind-baseline.md`             | Use before deploying the backend baseline to local Kubernetes with kind.                    | kind cluster setup, image loading, manifest apply, Service port-forward, health checks.  |
| Runtime Metrics     | Prometheus-compatible Actuator metrics baseline and runtime signal map.                                         | `runtime-metrics-baseline.md`  | Use before collecting backend runtime metrics or designing runtime-aware fitness inputs.    | `/actuator/prometheus`, latency/error/resource signals, Prometheus scrape metadata.      |
| Experiment Plan     | Detailed plan for adapting Lined to Kubernetes and runtime telemetry experiments for the article.               | `experiment-plan.md`           | Use before containerization, kind, Kubernetes, telemetry, load-test, or fitness-model work. | Research scope, experiment platform design, metrics, baselines, expected evidence.       |
| Experiment Tasks    | One-PR task table for iterative experiment implementation.                                                      | `experiment-tasks.md`          | Use before starting an experiment branch or PR.                                             | Branch naming, PR scope, implementation order, final-work expectations.                  |
| PR and Commit Guide | Pull request title/body template and commit-splitting rules.                                                    | `pull-requests-and-commits.md` | Use before opening a PR or creating commits.                                                | PR title selection, PR descriptions, fitness expectations, commit hygiene.               |

## Documentation Rules

- Keep backend documentation in this `docs/` directory.
- Update this index when adding, moving, or renaming backend documentation.
- Keep experiment work linked to `experiment-tasks.md`.
- Use `pull-requests-and-commits.md` before opening PRs or splitting commits.
- Use English for backend agent and documentation files.
