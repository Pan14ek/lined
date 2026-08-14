# Decision-Usefulness Reporting

This guide describes the decision-usefulness report for
`experiment/decision-usefulness-reporting`.

Decision-usefulness reporting is additive. It preserves `fitnessScore`,
`runtimeFitnessScore`, `adaptiveFitnessScore`, and `paretoOptimization`, then
adds a report that explains whether Pareto ranking exposes actionable
trade-off alternatives beyond a fixed scalar runtime comparator.

## Scope

This task provides:

- a versioned report named `decisionUsefulness`;
- a fixed runtime reporting comparator named `fixed-runtime-v1-reporting`;
- candidate-level trade-off rows comparing Pareto alternatives against the
  fixed scalar top candidate;
- reason codes for unavailable Pareto or comparator inputs;
- local collector output that can be used by later result-reporting work.

This task does not replace scalar scores, change Pareto ranking, run
Kubernetes or k6, add article-ready plots, or make decision-usefulness a CI
quality gate.

## Comparator

The report ranks all comparable runtime scenario candidates supplied through
`PARETO_RUNTIME_METRICS_JSONS`; it does not rank only the first Pareto front.

`fixed-runtime-v1-reporting` uses the runtime-aware v1 weights for active
Pareto objectives:

| Objective | Direction | Weight |
|-----------|-----------|--------|
| `latency_p95_ms` | minimize | `0.20` |
| `latency_p99_ms` | minimize | `0.15` |
| `error_rate` | minimize | `0.20` |
| `throughput_rps` | maximize | `0.15` |
| `availability` | maximize | `0.15` |
| `restart_count` | minimize | `0.10` |
| `cpu_utilization` | minimize | `0.025` |
| `memory_utilization` | minimize | `0.025` |

Each comparator objective is normalized across the supplied candidate set to
`[0, 1]`, where higher is better after applying the objective direction. Active
objectives without a fixed runtime weight are omitted from the comparator and
listed in `comparatorOmittedObjectives`.

Ties are deterministic and independent of Pareto metadata: scalar score
descending, then candidate id ascending.

## Output Contract

The metrics document adds decision-usefulness fields without changing existing
scores:

```json
{
  "paretoOptimizationVersion": "pareto-baseline-v1",
  "decisionUsefulnessVersion": "decision-usefulness-v1",
  "decisionUsefulness": {
    "paretoStatus": "available",
    "comparatorStatus": "available",
    "usefulnessClassification": "multiple-tradeoff-alternatives",
    "comparator": "fixed-runtime-v1-reporting",
    "reasonCodes": [],
    "candidateCount": 3,
    "activeObjectives": ["latency_p95_ms", "error_rate", "cpu_utilization"],
    "comparatorObjectives": ["latency_p95_ms", "error_rate", "cpu_utilization"],
    "comparatorOmittedObjectives": [],
    "paretoSelectedCandidateIds": [
      "fast-expensive:baseline:local-kind",
      "slow-efficient:baseline:local-kind"
    ],
    "fixedScalarRanking": [
      {
        "candidateId": "fast-expensive:baseline:local-kind",
        "rank": 1,
        "score": 0.916667
      }
    ],
    "fixedScalarTopCandidateId": "fast-expensive:baseline:local-kind",
    "tradeoffAlternativeIds": ["slow-efficient:baseline:local-kind"],
    "candidates": [
      {
        "candidateId": "slow-efficient:baseline:local-kind",
        "paretoRank": 1,
        "isParetoSelected": true,
        "fixedScalarRank": 2,
        "fixedScalarScore": 0.333333,
        "betterThanScalarTop": ["cpu_utilization"],
        "worseThanScalarTop": ["latency_p95_ms", "error_rate"],
        "equalToScalarTop": [],
        "rationale": "Improves cpu_utilization while sacrificing latency_p95_ms, error_rate compared with fixed scalar top."
      }
    ],
    "actionabilitySummary": "Pareto exposes 1 trade-off alternative(s) beyond fixed scalar top fast-expensive:baseline:local-kind."
  }
}
```

## Classification

`usefulnessClassification` records how much decision value the Pareto result
adds over the fixed scalar comparator:

| Classification | Meaning |
|----------------|---------|
| `unavailable` | Pareto ranking or fixed scalar comparison could not be computed. |
| `none` | Pareto did not expose an actionable alternative for the candidate set. |
| `single-best-only` | Pareto only confirms the same top candidate selected by the fixed scalar comparator. |
| `multiple-tradeoff-alternatives` | At least one Pareto-selected candidate differs from the scalar top and has concrete objective-level trade-offs. |

Unavailable reports keep Pareto and comparator reasons separate through
`paretoStatus`, `comparatorStatus`, and `reasonCodes`. Successful comparisons
keep `reasonCodes` empty; omitted but non-blocking comparator objectives are
reported in `comparatorOmittedObjectives`.

Reason codes are:

| Reason code | Meaning |
|-------------|---------|
| `missing-pareto-input` | No Pareto set, or fewer than two scenario summaries, was supplied. |
| `invalid-pareto-set` | Pareto metadata exists but is not usable for comparison. |
| `duplicate-candidate-identities` | Two summaries use the same `scenario:workload:source` identity. |
| `mixed-workload-or-source` | The scenario set mixes workload or source values. |
| `no-comparable-objectives` | No objective is present for every candidate. |
| `missing-comparator-weights` | Active Pareto objectives have no fixed runtime comparator weight. |
| `unavailable-scalar-ranking` | The fixed scalar reporting ranking could not be computed. |

## Local Example

```bash
cd fitness-metrics-collector
npm run build
RUNTIME_ONLY=true \
RUNTIME_METRICS_JSON=/absolute/path/replicas-2/runtime-summary.json \
PARETO_RUNTIME_METRICS_JSONS=/absolute/path/fixed-medium/runtime-summary.json,/absolute/path/replicas-2/runtime-summary.json,/absolute/path/hpa-cpu/runtime-summary.json \
METRICS_OUTPUT_JSON=/absolute/path/output/metrics-document.json \
npm run metrics
```

Use `decisionUsefulness.candidates` to explain which objectives each Pareto
alternative improves or sacrifices relative to the fixed scalar top candidate.
Use `decisionUsefulness.usefulnessClassification` only as a compact summary of
that candidate-level evidence.

## Compatibility Rules

- Existing DynamoDB documents remain valid when decision-usefulness fields are
  absent.
- Historical `fitnessScore`, `runtimeFitnessScore`, `adaptiveFitnessScore`, and
  `paretoOptimization` semantics do not change.
- Decision-usefulness reporting is experiment evidence, not a merge gate or
  production policy.
- Article-ready tables and plots belong to
  `experiment/experiment-results-reporting`.
