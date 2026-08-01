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

- [Billing plan](product/billing/BILLING_TASKS.md) and [billing tasks](product/billing/tasks/)
- [Feature flags](product/feature-flags/feature-flags.md) and [feature-flag tasks](product/feature-flags/tasks/)
- [Private events and tasks](product/privacy/private-events-and-tasks-system-design.md) and [privacy tasks](product/privacy/tasks/)
- API proposals: [calendar](product/calendar/proposals/), [dashboard](product/dashboard/proposals/), [events](product/events/proposals/), [lobbies](product/lobbies/proposals/), [users](product/users/proposals/), and [billing](product/billing/proposals/)

## Research

- [Experiment roadmap](research/experiment/experiment-tasks.md), [plan](research/experiment/experiment-plan.md), [results reporting](research/experiment/experiment-results-reporting.md), and [concurrency audits](research/experiment/audits/)
- [Runtime platform](research/platform/): containerization, kind, workload, telemetry, scenarios, and SLOs
- [Fitness models](research/fitness/): runtime, adaptive, Pareto, and decision-usefulness scoring
- [Advisory AI](research/ai/): LLM workflow, guardrails, validation, and agent evaluation

## Documentation rules

- Keep each document in the domain folder defined by [CONTEXT.md](CONTEXT.md).
- Update this index, `CONTEXT.md`, and `AGENTS.md` when adding, moving, or renaming a document.
- Keep feature-flag implementation tasks linked from the feature-flag design,
  the experiment roadmap, and the corresponding web task files.
- Keep experiment work linked to `research/experiment/experiment-tasks.md`.
- Use English for backend agent and documentation files.
