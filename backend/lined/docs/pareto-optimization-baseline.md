# Pareto Optimization Baseline

This guide describes the Pareto baseline for
`experiment/pareto-optimization-baseline`.

The baseline is additive. It preserves the structural `fitnessScore`, the
fixed `runtimeFitnessScore`, and the context-sensitive `adaptiveFitnessScore`,
then adds deterministic NSGA-II-style non-dominated sorting over a runtime
scenario set.

## Scope

This task provides:

- a versioned Pareto output named `paretoOptimization`;
- deterministic non-dominated fronts for deployment scenario variants;
- crowding distance metadata for first-front alternatives;
- explicit objective directions for runtime metrics;
- local collector input for a comma-separated set of runtime summaries.

This task does not replace scalar scoring, create a production optimizer, run
Kubernetes or k6 from the collector, change backend API behavior, or make
Pareto ranking a CI quality gate.

## Collector Inputs

Pareto comparison uses explicit runtime-summary artifacts:

```text
PARETO_RUNTIME_METRICS_JSONS=/path/fixed-medium/runtime-summary.json,/path/replicas-2/runtime-summary.json,/path/hpa-cpu/runtime-summary.json
```

Each file uses the same `runtime-summary.json` shape documented in
`docs/runtime-fitness-extension.md` and produced by the runtime scenario
runner. Normal CI runs can omit `PARETO_RUNTIME_METRICS_JSONS`; the collector
will still emit the Pareto version field without ranking candidates.

`RUNTIME_METRICS_JSON` and `RUNTIME_BASELINE_METRICS_JSON` remain the inputs
for single current-vs-baseline scalar runtime scoring. Pareto ranking is for
multi-scenario comparison and should use at least two summaries.

All summaries in one Pareto set must share the same `workload` and `source`.
Candidate identities use `scenario:workload:source` and must be unique. If the
input mixes workloads/sources or repeats a candidate identity, the collector
records `paretoOptimization.reason` and does not emit fronts.

## Objectives

The baseline compares only objectives that are present for every candidate in
the supplied set. This avoids ranking one deployment on a metric another
deployment did not measure.

| Objective | Direction |
|-----------|-----------|
| `latency_p95_ms` | minimize |
| `latency_p99_ms` | minimize |
| `error_rate` | minimize |
| `throughput_rps` | maximize |
| `availability` | maximize |
| `restart_count` | minimize |
| `cpu_utilization` | minimize |
| `memory_utilization` | minimize |

Objectives missing from at least one candidate are listed in
`paretoOptimization.omittedObjectives`.

## Output Contract

The metrics document adds Pareto fields without changing existing scores:

```json
{
  "fitnessScore": 0.1234,
  "runtimeFitnessScore": 0.2185,
  "adaptiveFitnessScore": 0.2712,
  "paretoOptimizationVersion": "pareto-baseline-v1",
  "paretoOptimization": {
    "objectiveVersion": "pareto-baseline-v1",
    "activeObjectives": ["latency_p95_ms", "error_rate", "throughput_rps"],
    "fronts": [
      ["replicas-2:baseline:local-kind", "fixed-small:baseline:local-kind"],
      ["fixed-medium:baseline:local-kind"]
    ],
    "selectedCandidateIds": [
      "fixed-small:baseline:local-kind",
      "replicas-2:baseline:local-kind"
    ]
  }
}
```

Candidate IDs use `scenario:workload:source`. `rank` starts at `1` for the
first non-dominated front. `crowdingDistance` follows the NSGA-II convention:
boundary candidates in a front use `"Infinity"` so diverse trade-off
alternatives are visible.

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

Use the resulting `paretoOptimization.fronts` and `selectedCandidateIds` to
compare trade-off alternatives before relying on a single scalar score.

## Compatibility Rules

- Existing Cosmos DB documents remain valid when Pareto fields are absent.
- Historical `fitnessScore`, `runtimeFitnessScore`, and `adaptiveFitnessScore`
  semantics do not change.
- Pareto ranking is deterministic and local to the supplied scenario set.
- The collector reads runtime summaries; it does not run scenario orchestration.
