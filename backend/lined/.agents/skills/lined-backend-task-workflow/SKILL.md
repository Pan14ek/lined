---
name: lined-backend-task-workflow
description: Implement a Lined backend task selected from docs/experiment-tasks.md, including bug/* and experiment/* rows, with repo-grounded analysis, Context7 documentation checks when requested, iterative implementation, critic sub-agent review loops, verification, commits, and push when requested by the repository workflow.
---

# Lined Backend Task Workflow

Use this skill from the Lined backend checkout root, the directory that
contains `AGENTS.md`, `docs/README.md`, and `docs/experiment-tasks.md`, when
the user asks to take a task from `docs/experiment-tasks.md` and implement it
end to end.

The task input is a row id, branch name, or unique phrase from
`docs/experiment-tasks.md`, for example:

```text
bug/account-provisioning-policy
experiment/runtime-scenario-summaries
```

## Trigger Phrases

Use this skill when the request says things like:

- "Take task <task> from docs/experiment-tasks.md"
- "Analyze the project, use Context7, then prepare commits"
- "Use a sub-agent as critic/reviewer"
- "Implement this bug/* or experiment/* task iteratively"

Do not use this skill for unrelated product work, research-only Notion updates,
or one-off questions that do not require implementation.

## First Pass

1. Confirm the current checkout is the Lined backend repository.
2. Read the local instructions before editing:
   - `AGENTS.md`
   - `docs/README.md`
   - `docs/experiment-tasks.md`
3. Locate the exact task row in `docs/experiment-tasks.md`.
4. Extract:
   - task branch or id
   - intended scope
   - acceptance criteria or expected artifact
   - likely docs to read next
   - whether the task is `bug/*` or `experiment/*`
5. Inspect `git status` before changing files. Preserve unrelated user changes.
6. If Beads is active or the instructions mention `bd`, run `bd prime` and use
   Beads for durable task state.

## Agent Selection

When the workflow needs a sub-agent, choose from the project-local agent
profiles in `.codex/agents`. Treat those TOML files as the source of truth:
read them before invoking an agent if the exact profile or capabilities matter.

Default choices:

- `pr_explorer`: use before implementation when the task needs independent
  read-only tracing of the current execution path.
- `docs_researcher`: use when external or version-specific documentation must
  be checked through a docs MCP server.
- `domain_expert`: use when business rules, domain terms, or product
  requirements need Notion-backed clarification.
- `reviewer`: use as the default critic after implementation slices; ask it to
  focus on correctness, security, regressions, and missing tests.
- `checkstyle_guardian`: use before build/check when Java edits may violate
  Checkstyle, import ordering, method length, or SpotBugs constraints.
- `exception_cleaner`: use when the task touches exception semantics,
  `EntityFinder`, raw Java exceptions, or RFC 7807 error mapping.
- `mapstruct_architect`: use when adding or reshaping domain modules,
  controllers, DTO records, MapStruct mappers, entities, repositories, or
  services.
- `telemetry_experimenter`: use for experiment work involving Actuator,
  Micrometer, Prometheus, OpenTelemetry, Kubernetes, runtime summaries,
  resource limits, HPA, or deployment metrics.

Use the narrowest suitable agent. If several apply, sequence them by phase:
exploration first, specialist review second, general `reviewer` last. Do not
ask every agent to review every change.

## Context7

If the user asks to use Context7, use it for current primary-source
documentation on libraries, frameworks, SDKs, CLIs, or cloud services involved
in the task. Keep the lookup focused on the API surface actually being changed.

Common examples:

- Spring Boot configuration properties, Actuator, health probes, Micrometer
- Gradle, JUnit, Mockito, AssertJ
- Kubernetes, kustomize, Prometheus, k6
- Node.js tooling used by experiment scripts

Do not use Context7 as a substitute for reading the local repo. Local code and
project docs remain the source of truth for project behavior.

## Planning

Before implementation, restate the task in repo terms:

1. Which task row is being implemented.
2. Which files or modules are likely involved.
3. Which public contracts must stay stable.
4. The implementation slices.
5. The verification plan.

Keep the plan small and executable. Do not create markdown TODO files; use
Beads for durable follow-up work when needed.

## Implementation Loop

Work one coherent slice at a time:

1. Design the smallest change that satisfies the current slice.
2. Edit only the files needed for that slice.
3. Add or update tests for new service behavior.
4. Run the narrowest useful verification for that slice.
5. Run a critic review before moving to the next meaningful slice.
6. Fix critic findings.
7. Repeat the critic review until it says the implementation is acceptable or
   only non-blocking tradeoffs remain.

For small tasks, one critic pass after the full implementation is acceptable.
For broader tasks, run the critic after each meaningful slice.

## Critic Sub-Agent

When a critic sub-agent or multi-agent tool is available, select the critic
from `.codex/agents` using the Agent Selection table above. Ask it to review
only the task-relevant diff and local context. The critic should focus on:

- logical correctness
- overengineering or unnecessary abstraction
- security and data integrity risks
- readability and maintainability
- adherence to Lined backend architecture rules
- test coverage and verification gaps
- accidental public API or schema breaks

Give the critic the task row, relevant files, and diff. Do not give it the
desired verdict.

If no sub-agent tool is available, perform a separate explicit self-review with
the same checklist and say that a real sub-agent was unavailable.

Treat critic approval as a commit gate when the user requested a critic loop.
Do not commit while blocking critic findings remain.

## Backend Rules To Preserve

- Preserve existing HTTP route shape unless the user explicitly asks for an API
  break.
- Keep controller -> service -> repository -> entity layering.
- Keep controllers thin.
- Use `jakarta.transaction.Transactional` on service implementations.
- Use `EntityFinder.findOrThrow()` for lookups.
- Use `BaseAppException` subclasses for mapped domain errors.
- Keep DTOs as records.
- Keep MapStruct mappers strict with `ReportingPolicy.ERROR`.
- Use `OffsetDateTime` for persisted timestamps.
- Keep JPA associations lazy.
- Do not broaden experiment work into product AI features or microservices
  unless the selected task explicitly requires it.

## Verification

Choose checks based on changed files and risk:

- Java service or controller changes: run focused tests first, then
  `./gradlew test` or `./gradlew check` when feasible.
- Checkstyle-sensitive Java edits: run `./gradlew checkstyleMain` or
  `./gradlew check`.
- Static-analysis-sensitive changes: run `./gradlew spotbugsMain` or
  `./gradlew check`.
- Experiment script changes: run targeted `node --test`, `node --check`, JSON
  validation, `kubectl kustomize`, or task-specific smoke commands.
- Docs-only changes: run `git diff --check` and any relevant link or artifact
  checks available locally.

Be honest about commands that cannot run because of missing services, missing
tools, sandbox limits, or credentials.

## Commit And Push

Commit only after:

- the task row still matches the implemented scope
- unrelated worktree changes are excluded
- verification has run or the limitation is clearly documented
- critic findings are resolved or explicitly non-blocking

Use focused commits with messages that explain the behavior change, not just
the files touched.

If the user says "prepare commits" in this repository context, create the
commit. If the active repository instructions require push for session
completion, push after the commit succeeds. If push fails, report the exact
blocker and retry when it is safe to do so.

## Final Response

Report:

- task implemented
- main files changed
- verification commands and outcomes
- critic result
- commit hash and push status, if committed
- any remaining follow-up work filed in Beads
