# Lined Backend Documentation

This directory is the documentation home for the Spring Boot backend and the
scientific experiment work based on it. Start with [Documentation Context](CONTEXT.md)
to choose the domain, then open the document needed for the change.

## Foundation

- [Architecture](foundation/architecture.md)
- [API reference](foundation/api.md)
- [Testing guide](foundation/testing.md)

## Governance

- [Notion knowledge-base workflow](governance/notion-knowledge-base-workflow.md)
- [Pull requests and commits](governance/pull-requests-and-commits.md)

## Product domains

- [Authentication context](product/authentication/CONTEXT.md), [security system design](product/authentication/authentication-security-system-design.md), and [SDD tasks](product/authentication/authentication-security-tasks.md)
- [Users context](product/users/CONTEXT.md)
- [Lobbies context](product/lobbies/CONTEXT.md) and [lobby invitations context](product/lobby-invitations/CONTEXT.md)
- [Tasks context](product/tasks/CONTEXT.md)
- [Calendar context](product/calendar/CONTEXT.md)
- [Notifications context](product/notifications/CONTEXT.md)
- [Roles context](product/roles/CONTEXT.md)
- [Billing plan](product/billing/BILLING_TASKS.md) and [billing tasks](product/billing/tasks/)
- [Billing context](product/billing/CONTEXT.md)
- [Feature-flags context](product/feature-flags/CONTEXT.md),
  [feature-flag design](product/feature-flags/feature-flags.md), and
  [feature-flag tasks](product/feature-flags/tasks/)
- [Privacy context](product/privacy/CONTEXT.md), [private events and tasks design](product/privacy/private-events-and-tasks-system-design.md), and [privacy tasks](product/privacy/tasks/)
- API proposals: [calendar](product/calendar/proposals/), [dashboard](product/dashboard/proposals/), [events](product/events/proposals/), [lobbies](product/lobbies/proposals/), [users](product/users/proposals/), and [billing](product/billing/proposals/)

## Research

- [Experiment roadmap](research/experiment/experiment-tasks.md), [plan](research/experiment/experiment-plan.md), [results reporting](research/experiment/experiment-results-reporting.md), [concurrency audits](research/experiment/audits/), and the [private-item cross-surface audit](research/experiment/audits/private-item-cross-surface-audit.md)
- [Runtime platform](research/platform/): containerization, kind, workload, telemetry, scenarios, SLOs, and [DynamoDB metrics storage](research/platform/dynamodb-metrics-store.md)
- [Fitness models](research/fitness/): runtime, adaptive, Pareto, and decision-usefulness scoring
- [Advisory AI](research/ai/): LLM workflow, guardrails, validation, and agent evaluation

## Documentation rules

- Keep each document in the domain folder defined by [CONTEXT.md](CONTEXT.md).
- Update this index, `CONTEXT.md`, and `AGENTS.md` when adding, moving, or renaming a document.
- Keep feature-flag implementation tasks linked from the feature-flag design,
  the experiment roadmap, and the corresponding web task files.
- Keep experiment work linked to `research/experiment/experiment-tasks.md`.
- Use English for backend agent and documentation files.
