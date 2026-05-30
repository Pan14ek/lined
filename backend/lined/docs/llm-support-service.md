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

## Implementation Tasks

| Branch name | Name | Detailed description | Expected result |
|-------------|------|----------------------|-----------------|
| `experiment/llm-support-service-plan` | LLM support service plan | Add the service architecture, boundaries, input/output contracts, deployment options, and implementation sequence for a separate advisory LLM service. | The backend docs explain how LLM assistance fits the experiment without becoming the architecture evaluator. |
| `experiment/llm-support-service-prototype` | LLM support service prototype | Add a locally runnable service or function-shaped prototype that accepts sanitized requirements/SLO/runtime-summary inputs and returns candidate rule suggestions. | Researchers can manually invoke a non-blocking LLM helper and inspect versioned advisory output. |
| `experiment/llm-rule-review-workflow` | LLM rule review workflow | Add an explicit approval workflow for converting LLM-suggested candidate rules into versioned fitness configuration entries. | Candidate rules are reviewed, classified, and traceable before affecting runtime-aware scoring. |
| `experiment/llm-tradeoff-explanations` | LLM trade-off explanations | Use experiment result artifacts to generate explanation drafts for scenario comparisons and Pareto trade-offs. | Result reporting can include reviewed explanation text while numeric evaluation remains telemetry-driven. |

## Recommended Order

Implement this after the experiment has real evidence artifacts:

1. `experiment/runtime-scenario-summaries`
2. `experiment/slo-constraint-thresholds`
3. `experiment/runtime-aware-scoring`
4. `experiment/llm-support-service-prototype`
5. `experiment/llm-rule-review-workflow`
6. `experiment/adaptive-weighted-fitness`
7. `experiment/pareto-optimization-baseline`
8. `experiment/llm-tradeoff-explanations`
9. `experiment/experiment-results-reporting`

The plan task can exist earlier because it defines boundaries and prevents
scope drift.
