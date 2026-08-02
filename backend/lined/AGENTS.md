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

| Name                | Description                                                               | Path                                | When you should use it                                                       | Cases for using                                                                         |
|---------------------|---------------------------------------------------------------------------|-------------------------------------|------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| Backend Docs Index  | Routing table for all backend documentation.                              | `docs/README.md`                    | Start here when you need backend documentation context.                      | Choosing which document to read, checking docs coverage, adding new backend docs.       |
| Documentation Context | Domain-folder map for all backend documentation.                         | `docs/CONTEXT.md`                   | Use after the index to locate a document's canonical domain.                 | Adding, moving, renaming, or browsing backend documentation.                            |
| Architecture Guide  | Backend modules, layers, domain boundaries, and known architecture notes. | `docs/foundation/architecture.md`              | Before changing backend structure or adding a module.                        | New feature design, refactoring, checking layering, documenting architecture decisions. |
| Testing Guide       | Backend test conventions, tools, and expectations.                        | `docs/foundation/testing.md`                   | Before writing or changing backend tests.                                    | Unit tests, integration tests, service behavior coverage, Mockito patterns.             |
| API Documentation   | Current backend API reference.                                            | `docs/foundation/api.md`                       | When changing endpoints, DTOs, or API behavior.                              | Request/response review, endpoint coverage, Swagger/API alignment.                      |
| Notion KB Workflow  | Notion write-back, verification, fallback, and entry-template rules.       | `docs/governance/notion-knowledge-base-workflow.md` | When research or experiment analysis changes durable knowledge.              | Notion as knowledge base, artifact analysis, experiment findings, research handoff.     |
| Experiment Plan     | Scientific experiment context and adaptation strategy.                    | `docs/research/experiment/experiment-plan.md`           | Before experiment-related backend, Kubernetes, telemetry, or load-test work. | Containerization, kind deployment, runtime metrics, fitness-model extension.            |
| Experiment Tasks    | One-PR task table for iterative experiment work.                          | `docs/research/experiment/experiment-tasks.md`          | Before starting an experiment implementation branch.                         | Branch planning, PR scope control, experiment roadmap tracking.                         |
| LLM Support Service | Plan for a separate advisory LLM service for candidate rule synthesis.    | `docs/research/ai/llm-support-service.md`       | Before designing LLM-assisted fitness-rule synthesis or explanation support. | Serverless/manual triggers, sanitized inputs, advisory outputs, review workflow.        |
| PR and Commit Guide | Pull request title/body and commit-splitting rules.                       | `docs/governance/pull-requests-and-commits.md` | Before opening a PR or creating commits.                                     | PR descriptions, fitness expectations, commit scope, review readiness.                  |

### Feature Context Maintenance

Before repository analysis, bug diagnosis, or editing feature-related work,
first read `docs/CONTEXT.md` to identify every relevant product feature; then
read each corresponding `docs/product/<feature>/CONTEXT.md` and its linked API
and feature-specific documentation; then use that context to plan and perform
the work. This happens before implementation or diagnosis, not merely before
committing.

Before committing a change, identify every affected product feature. Update
the `CONTEXT.md` in each affected feature folder whenever code, API behavior,
persistence or data-model behavior, cross-feature interaction, class ownership,
or linked documentation changes. When one change spans multiple features,
update every applicable context file. In the pull request's testing notes,
state which context files were updated or explain why no feature context was
applicable.

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

- Use one PR per task from `docs/research/experiment/experiment-tasks.md`.
- Use the `experiment/` branch prefix for scientific experiment work.
- Use `docs/governance/notion-knowledge-base-workflow.md` when experiment analysis,
  implementation status, artifact analysis, limitations, open questions, or
  article-ready findings should be preserved in Notion.
- Use `docs/governance/pull-requests-and-commits.md` when writing PR titles,
  descriptions, and commits.
- Keep experiment changes reproducible and documented.
- Do not add product AI features as part of the first experiment phase.
- Do not split the backend into microservices unless a later experiment task
  explicitly requires a controlled architecture alternative.
- For Kubernetes/runtime work, preserve existing REST behavior and measure
  deployment/runtime differences rather than changing the product domain.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->

## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote;
`.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for
details and anti-patterns.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- END BEADS INTEGRATION -->

<!-- BEGIN BEADS CODEX SETUP: generated by bd setup codex -->

## Beads Issue Tracker

Use Beads (`bd`) for durable task tracking in repositories that include it. Use the `beads` skill at
`.agents/skills/beads/SKILL.md` (project install) or `~/.agents/skills/beads/SKILL.md` (global install) for Beads
workflow guidance, then use the `bd` CLI for issue operations.

### Quick Reference

```bash
bd ready                # Find available work
bd show <id>            # View issue details
bd update <id> --claim  # Claim work
bd close <id>           # Complete work
bd prime                # Refresh Beads context
```

### Rules

- Use `bd` for all task tracking; do not create markdown TODO lists.
- Run `bd prime` when Beads context is missing or stale.
- Keep persistent project memory in Beads via `bd remember`; do not create ad hoc memory files.

<!-- END BEADS CODEX SETUP -->
