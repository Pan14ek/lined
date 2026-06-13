# LLM Support Service Plan

This guide describes a separate advisory backend service for the Lined
experiment. The service supports the research question about LLM-assisted
fitness-rule synthesis without turning the LLM into the final evaluator of
architecture quality.

## Scope

The LLM support service may:

- read requirements, ADRs, SLO definitions, and experiment summaries;
- propose candidate quality scenarios, metrics, thresholds, and fitness rules;
- classify proposed rules as objectives, hard constraints, context signals, or
  validation evidence;
- generate human-readable explanations for observed trade-offs.

The service must not:

- replace the formal runtime-aware fitness score;
- decide whether an architecture variant is good or bad by itself;
- become a blocking CI quality gate;
- change backend product behavior;
- store secrets, raw telemetry dumps, pod manifests, or unbounded logs in model
  prompts or outputs.

## Prototype Helper

`experiment/llm-support-service-prototype` adds a locally runnable advisory
helper at `load-tests/runtime-scenarios/llm-support-service-cli.mjs`.

The prototype is intentionally bounded:

- it accepts only sanitized requirements markdown, `runtime-summary.json`
  artifacts, and `slo-thresholds-v1.json`;
- it can optionally read the runtime quality scenario catalog to keep
  objective/constraint/context terminology aligned with the repository docs;
- it writes a versioned advisory artifact named
  `candidate-rule-suggestions.json`;
- it remains non-blocking and advisory even when an LLM provider is used.

The helper supports two provider modes:

| Provider | Purpose | Network requirement |
|----------|---------|---------------------|
| `mock` | Deterministic offline synthesis for local testing and fixture-based review. | None |
| `openai` | Structured-output advisory generation through the OpenAI Responses API. | `OPENAI_API_KEY` and outbound network access |

Use `mock` for repeatable offline verification. Use `openai` only when the
input artifacts are ready for human review and you want candidate-rule drafts
instead of deterministic heuristics.

## Integration Position

Use the service before and after the formal experiment loop.

```text
Requirements / ADRs / SLOs / runtime-summary.json artifacts
        |
        v
LLM support service
        |
        v
Candidate scenarios, metrics, thresholds, and rule drafts
        |
        v
Researcher / architect validation
        |
        v
Versioned fitness configuration
        |
        v
Telemetry-driven scoring and GA/Pareto optimization
        |
        v
LLM-assisted trade-off explanation
```

The formal evaluation remains in the telemetry-driven fitness model. The LLM
service produces advisory artifacts that must be reviewed before they influence
fitness configuration or article conclusions.

## Deployment Options

| Option | Trigger | Best use | Constraint |
|--------|---------|----------|------------|
| Local script or small service | Manual command | First prototype and paper iteration | Researcher controls all inputs and approves outputs. |
| Backend-side internal service | HTTP endpoint or scheduled worker | Repeatable local experiments | Keep it separate from product API behavior. |
| Azure Function | Timer trigger or manual HTTP trigger | Scheduled rule synthesis in Azure | Store only sanitized summaries and configuration. |
| AWS Lambda | EventBridge schedule or manual invocation | Scheduled rule synthesis in AWS | Keep invocation advisory and non-blocking. |
| GitHub Actions advisory job | After experiment artifact generation | PR comments or report fragments | Do not fail CI based on LLM judgment. |

For the first implementation, prefer a locally runnable service or function
shape that can later be deployed to Azure Functions or AWS Lambda without
changing the research contract.

## Inputs

The service should consume bounded, explicit artifacts:

| Input | Example | Role |
|-------|---------|------|
| Requirements and ADR excerpts | Architecture decision notes, quality attributes | Derive candidate quality scenarios. |
| SLO definitions | latency and error-rate thresholds | Propose constraints and threshold rationale. |
| Runtime summaries | `runtime-summary.json` from scenario runs | Ground suggestions in measured evidence. |
| Fitness configuration | active objectives, constraints, weights | Detect missing or inconsistent rules. |
| Experiment result tables | scenario comparison outputs | Generate trade-off explanations. |

Do not send raw Prometheus exposition text, full Kubernetes YAML, secrets,
environment variables, or user data to the LLM support service.

## Outputs

Use versioned, reviewable outputs:

```json
{
  "schema_version": 1,
  "source_artifacts": [
    "runtime-summary-fixed-medium-baseline.json",
    "slo-thresholds-v1.json"
  ],
  "candidate_rules": [
    {
      "name": "p95 latency under baseline workload",
      "classification": "objective_with_constraint",
      "metric": "latency_p95_ms",
      "direction": "minimize",
      "constraint": "latency_p95_ms <= configured_slo_ms",
      "rationale": "Represents user-visible responsiveness under the selected workload.",
      "requires_human_approval": true
    }
  ],
  "tradeoff_explanations": [
    {
      "scenario": "replicas-2",
      "summary": "Lower latency may be exchanged for higher resource cost."
    }
  ]
}
```

Outputs should be stored as experiment artifacts, not silently applied to the
scoring model. A later implementation can add an explicit approval step that
copies validated rules into a versioned fitness configuration.

The prototype output shape is:

```json
{
  "schema_version": 1,
  "prototype_version": "llm-support-service-prototype-v1",
  "provider": "mock",
  "model": "deterministic-mock-v1",
  "generated_at": "2026-06-12T20:00:00.000Z",
  "source_artifacts": [
    {
      "artifactType": "runtime-summary",
      "identity": "fixed-medium:baseline:local-kind",
      "path": "/absolute/path/runtime-summary.json"
    }
  ],
  "candidate_rules": [
    {
      "name": "Latency P95 Local",
      "classification": "objective-with-constraint",
      "metric": "latency_p95_ms",
      "direction": "minimize",
      "constraint": "latency_p95_ms <= 1000",
      "rationale": "Keeps stable local scenario comparisons inside the existing k6 reproducibility guardrail without treating it as a production SLO.",
      "evidence": "existing-k6-guardrail",
      "scenarioScope": [
        "fixed-medium",
        "replicas-2"
      ],
      "requires_human_approval": true
    }
  ],
  "tradeoff_explanations": [],
  "review_notes": [
    "All candidate rules are advisory only and require human approval before promotion."
  ]
}
```

The JSON contract keeps source artifacts, candidate rules, and review notes
explicit so later approval workflow tasks can classify and promote suggestions
without re-reading raw prompts.

The advisory artifact remains raw output in this task family.
`candidate-rule-suggestions.json` is not the place to store reviewed or
promoted state. `docs/llm-rule-review-workflow.md` defines the separate review
and promotion artifacts used after human validation.

## How To Use And Test

Prepare bounded inputs:

1. One or more markdown excerpts that capture requirements, ADR notes, or
   quality-attribute expectations.
2. One or more collector-ready `runtime-summary.json` artifacts.
3. `load-tests/runtime-scenarios/slo-thresholds-v1.json`.
4. Optionally `load-tests/runtime-scenarios/runtime-quality-scenarios-v1.json`
   when you want the helper to align objective/constraint/context terminology
   with the runtime scenario catalog.

Run the deterministic offline helper:

```bash
node load-tests/runtime-scenarios/llm-support-service-cli.mjs \
  --provider mock \
  --requirements-md docs/llm-support-service.md \
  --runtime-summary /absolute/path/fixed-medium/runtime-summary.json \
  --runtime-summary /absolute/path/replicas-2/runtime-summary.json \
  --slo-json load-tests/runtime-scenarios/slo-thresholds-v1.json \
  --scenario-catalog-json load-tests/runtime-scenarios/runtime-quality-scenarios-v1.json \
  --output-dir /absolute/path/llm-support-output
```

Run the OpenAI-backed helper:

```bash
OPENAI_API_KEY=... \
node load-tests/runtime-scenarios/llm-support-service-cli.mjs \
  --provider openai \
  --model gpt-5.5 \
  --requirements-md docs/llm-support-service.md \
  --runtime-summary /absolute/path/fixed-medium/runtime-summary.json \
  --slo-json load-tests/runtime-scenarios/slo-thresholds-v1.json \
  --output-dir /absolute/path/llm-support-output
```

The helper writes:

- `candidate-rule-suggestions.json` with versioned advisory output;
- no backend code, schema, or metrics collector state changes;
- no automatic promotion into runtime-aware scoring configuration.

Verify locally with:

```bash
node --check load-tests/runtime-scenarios/llm-support-service.mjs
node --check load-tests/runtime-scenarios/llm-support-service-cli.mjs
node --test load-tests/runtime-scenarios/*.test.mjs
```

Review the generated candidate rules against the input artifacts before they
are cited in reporting or copied into a later approval workflow.

## Validation Rules

Before an LLM-suggested rule becomes part of the experiment:

1. Confirm the metric can be measured from the current telemetry pipeline or
   runtime summary contract.
2. Classify the rule as an objective, hard constraint, context signal, or
   validation evidence.
3. Check that thresholds are either source-backed, empirically calibrated, or
   clearly marked as initial assumptions.
4. Confirm the rule does not duplicate or contradict an existing rule.
5. Record the reviewer decision and the source artifacts used.

Use `docs/llm-rule-review-workflow.md` when you need the executable review and
promotion workflow that applies these checks to each candidate rule.

Use `docs/llm-rule-validation-checklist.md` after review when you need an
explicit checklist report for source evidence, telemetry linkage, threshold
rationale, and expert approval before using a reviewed rule as promotion-ready
evidence.

## Implementation Tasks

| Branch name | Name | Detailed description | Expected result |
|-------------|------|----------------------|-----------------|
| `experiment/llm-support-service-plan` | LLM support service plan | Add the service architecture, boundaries, input/output contracts, deployment options, and implementation sequence for a separate advisory LLM service. | The backend docs explain how LLM assistance fits the experiment without becoming the architecture evaluator. |
| `experiment/llm-support-service-prototype` | LLM support service prototype | Add a locally runnable service or function-shaped prototype that accepts sanitized requirements/SLO/runtime-summary inputs and returns candidate rule suggestions. | Researchers can manually invoke a non-blocking LLM helper and inspect versioned advisory output. |
| `experiment/llm-rule-review-workflow` | LLM rule review workflow | Add an explicit approval workflow for converting LLM-suggested candidate rules into versioned fitness configuration entries. | Candidate rules are reviewed, classified, and traceable before affecting runtime-aware scoring. |
| `experiment/llm-rule-validation-checklist` | LLM rule validation checklist | Add an explicit evidence checklist over reviewed rules for source artifacts, telemetry linkage, classification, threshold rationale, and expert approval. | Reviewed rules stay advisory and evidence-checked before they are treated as promotion-ready or article-ready. |
| `experiment/llm-tradeoff-explanations` | LLM trade-off explanations | Use experiment result artifacts to generate explanation drafts for scenario comparisons and Pareto trade-offs. | Result reporting can include reviewed explanation text while numeric evaluation remains telemetry-driven. |

## Recommended Order

Implement this after the experiment has real evidence artifacts:

1. `experiment/runtime-scenario-summaries`
2. `experiment/slo-constraint-thresholds`
3. `experiment/runtime-aware-scoring`
4. `experiment/llm-support-service-prototype`
5. `experiment/llm-rule-review-workflow`
6. `experiment/llm-rule-validation-checklist`
7. `experiment/adaptive-weighted-fitness`
8. `experiment/pareto-optimization-baseline`
9. `experiment/llm-tradeoff-explanations`
10. `experiment/experiment-results-reporting`

The plan task can exist earlier because it defines boundaries and prevents
scope drift.
