# Adaptive Weighted Fitness

This guide describes the adaptive scalar fitness score for
`experiment/adaptive-weighted-fitness`.

Adaptive weighted fitness is additive. It preserves the existing structural
`fitnessScore` and the runtime-aware `runtimeFitnessScore`, then adds a separate
versioned score that changes weights by experiment context.

## Scope

This task provides:

- a versioned scalar score named `adaptiveFitnessScore`;
- explicit context selection through `ADAPTIVE_FITNESS_CONTEXT`;
- deterministic `auto` context selection from workload, SLO, and resource
  pressure evidence;
- metadata that records the selected context, weight profile, active weights,
  active signal values, and missing signals.

This task does not replace `fitnessScore`, replace `runtimeFitnessScore`, add a
Pareto optimizer, change backend API behavior, create production SLOs, or make
adaptive scoring a CI quality gate.

## Collector Inputs

Adaptive scoring runs as part of the existing metrics collector output path.
The optional context input is:

```text
ADAPTIVE_FITNESS_CONTEXT=auto
```

Supported values:

| Value | Meaning |
|-------|---------|
| `auto` | Select the context from runtime evidence. This is the default. |
| `balanced` | Keep structural and runtime signals broadly balanced. |
| `workload` | Emphasize latency, throughput, and error rate under non-baseline workloads. |
| `slo` | Emphasize latency, error rate, availability, and restarts. |
| `resource-pressure` | Emphasize CPU and memory utilization while preserving performance signals. |

Runtime inputs still use the existing runtime-aware scoring variables:

```text
RUNTIME_METRICS_JSON=/absolute/path/to/runtime-summary.json
RUNTIME_BASELINE_METRICS_JSON=/absolute/path/to/baseline-runtime-summary.json
```

When `RUNTIME_ONLY=true`, `fitnessScore` is not recomputed. Adaptive scoring can
still use comparable runtime deltas when a baseline is available, and measured
SLO/resource-pressure penalties when the threshold classifier reports them.
Full experiment comparisons should include both structural CI evidence and
runtime summaries.

## Output Contract

The metrics document adds adaptive fields without changing existing score
semantics:

```json
{
  "fitnessScore": 0.1234,
  "runtimeFitnessScore": 0.2185,
  "runtimeFitnessScoreVersion": "runtime-aware-v1",
  "adaptiveFitnessScore": 0.2712,
  "adaptiveFitnessScoreVersion": "adaptive-weighted-v1",
  "adaptiveFitness": {
    "requestedContext": "auto",
    "selectedContext": "slo",
    "activeSignalWeights": {
      "structural_quality": 0.15,
      "latency_p95_ms": 0.25,
      "error_rate": 0.2
    },
    "missingSignals": []
  }
}
```

`fitnessScore` remains the CI-only structural score. `runtimeFitnessScore`
remains the fixed runtime-aware scalar score. `adaptiveFitnessScore` is the
context-sensitive baseline for comparing whether a single scalar can react to
workload, SLO, or resource-pressure context.

## Auto Context Selection

`ADAPTIVE_FITNESS_CONTEXT` overrides automatic selection when it is set to a
non-`auto` value. Otherwise the collector chooses the first matching context:

1. `slo` when current runtime evidence has a measured invalid hard SLO
   constraint.
2. `resource-pressure` when CPU or memory utilization crosses a warning
   threshold in the active SLO threshold artifact.
3. `workload` when the current workload name is not `baseline`.
4. `balanced` when no stronger context applies.

Unknown hard constraints affect runtime comparison eligibility, but they do not
select `slo` by themselves because adaptive weighting should react to measured
evidence rather than missing evidence.

## Signals And Missing Data

Adaptive scoring can use these signals:

| Signal | Source |
|--------|--------|
| `structural_quality` | Top-level `fitnessScore`, when structural metrics were collected. |
| `latency_p95_ms` | Runtime normalized delta, with invalid SLO pressure floored at `-1`. |
| `latency_p99_ms` | Runtime normalized delta, with invalid SLO pressure floored at `-1`. |
| `error_rate` | Runtime normalized delta, with invalid SLO pressure floored at `-1`. |
| `throughput_rps` | Runtime normalized delta from `runtimeFitness.normalizedDeltas`. |
| `availability` | Runtime normalized delta, with invalid SLO pressure floored at `-1`. |
| `restart_count` | Runtime normalized delta, with invalid SLO pressure floored at `-1`. |
| `cpu_utilization` | Runtime normalized delta, with resource-pressure warnings floored at `-0.5`. |
| `memory_utilization` | Runtime normalized delta, with resource-pressure warnings floored at `-0.5`. |

Missing signals are omitted and the active weights are renormalized. If no
structural or runtime signals are available, `adaptiveFitnessScore` is `null`
and `adaptiveFitness.reason` explains why.

## Local Example

```bash
cd fitness-metrics-collector
npm run build
RUNTIME_ONLY=true \
ADAPTIVE_FITNESS_CONTEXT=auto \
RUNTIME_METRICS_JSON=/absolute/path/current/runtime-summary.json \
RUNTIME_BASELINE_METRICS_JSON=/absolute/path/baseline/runtime-summary.json \
METRICS_OUTPUT_JSON=/absolute/path/output/metrics-document.json \
npm run metrics
```

Use explicit contexts for controlled sensitivity checks:

```bash
ADAPTIVE_FITNESS_CONTEXT=slo npm run metrics
ADAPTIVE_FITNESS_CONTEXT=resource-pressure npm run metrics
```

## Compatibility Rules

- Existing Cosmos DB documents remain valid when adaptive fields are absent.
- Historical `fitnessScore` charts remain structural-only.
- Runtime-aware scoring remains available for fixed runtime scalar comparison.
- Adaptive scoring is an experiment output, not a merge gate or production SLO.
